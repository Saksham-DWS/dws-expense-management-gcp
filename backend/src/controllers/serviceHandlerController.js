import ExpenseEntry from '../models/ExpenseEntry.js';
import User from '../models/User.js';
import RenewalLog from '../models/RenewalLog.js';
import { sendCancellationNotificationEmail } from '../services/emailService.js';
import { createNotification } from '../controllers/notificationController.js';

// Build a permissive regex pattern from handler name (full + tokens)
const buildNamePattern = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokens = name
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = [escapedName, ...tokens].join('|');
  return new RegExp(pattern, 'i');
};

// @desc    Respond to renewal notification
// @route   POST /api/service-handler/renewal-response/:entryId
// @access  Private (Service Handler)
export const respondToRenewal = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { continueService, reason } = req.body;

    const expenseEntry = await ExpenseEntry.findById(entryId);

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    // Verify service handler (case-insensitive) and business unit
    if (expenseEntry.businessUnit !== req.user.businessUnit) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this renewal',
      });
    }
    const nameRegex = buildNamePattern(req.user.name);
    if (!nameRegex.test(expenseEntry.serviceHandler)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this renewal',
      });
    }

    if (continueService) {
      // Save renewal log
      await RenewalLog.create({
        expenseEntry: expenseEntry._id,
        serviceHandler: req.user.name,
        action: 'Continue',
        reason,
        renewalDate: expenseEntry.nextRenewalDate,
      });

      // Notify MIS and BU Admin internally
      const misManagers = await User.find({ role: 'mis_manager' });
      const superAdmins = await User.find({ role: 'super_admin' });
      const buAdmins = await User.find({
        role: 'business_unit_admin',
        businessUnit: expenseEntry.businessUnit,
      });

      await Promise.all([
        ...misManagers.map((mis) =>
          createNotification(
            mis._id,
            'service_continued',
            'Service renewal confirmed',
            `${req.user.name} will continue ${expenseEntry.particulars} (${expenseEntry.businessUnit})`,
            expenseEntry._id,
            { renewalDate: expenseEntry.nextRenewalDate }
          )
        ),
        ...buAdmins.map((admin) =>
          createNotification(
            admin._id,
            'service_continued',
            'Service renewal confirmed',
            `${req.user.name} will continue ${expenseEntry.particulars} (${expenseEntry.businessUnit})`,
            expenseEntry._id,
            { renewalDate: expenseEntry.nextRenewalDate }
          )
        ),
      ]);

      res.status(200).json({
        success: true,
        message: 'Your response has been recorded. The service will continue.',
      });
    } else {
      // Log cancellation request
      await RenewalLog.create({
        expenseEntry: expenseEntry._id,
        serviceHandler: req.user.name,
        action: 'Cancel',
        reason,
        renewalDate: expenseEntry.nextRenewalDate || new Date(),
      });

      // Send cancellation notification to MIS
      const misManagers = await User.find({ role: 'mis_manager' });
      const superAdmins = await User.find({ role: 'super_admin' });
      const buAdmins = await User.find({
        role: 'business_unit_admin',
        businessUnit: expenseEntry.businessUnit,
      });

      await Promise.all(
        misManagers.map((mis) => sendCancellationNotificationEmail(mis.email, expenseEntry, reason))
      );

      const purchaseDateValue = expenseEntry.date ? expenseEntry.date.toISOString() : null;

      await Promise.all([
        ...misManagers.map((mis) =>
          createNotification(
            mis._id,
            'service_cancellation',
            'Service Cancellation Request',
            `${req.user.name} (${expenseEntry.businessUnit}) has requested to cancel ${expenseEntry.particulars}${
              purchaseDateValue ? ` (purchased on ${new Date(purchaseDateValue).toLocaleDateString()})` : ''
            }`,
            expenseEntry._id,
            {
              reason,
              service: expenseEntry.particulars,
              businessUnit: expenseEntry.businessUnit,
              serviceHandler: req.user.name,
              amount: expenseEntry.amount,
              currency: expenseEntry.currency,
              recurring: expenseEntry.recurring,
              purchaseDate: purchaseDateValue,
            }
          )
        ),
        ...superAdmins.map((admin) =>
          createNotification(
            admin._id,
            'service_cancellation',
            'Service Cancellation Request',
            `${req.user.name} (${expenseEntry.businessUnit}) has requested to cancel ${expenseEntry.particulars}${
              purchaseDateValue ? ` (purchased on ${new Date(purchaseDateValue).toLocaleDateString()})` : ''
            }`,
            expenseEntry._id,
            {
              reason,
              service: expenseEntry.particulars,
              businessUnit: expenseEntry.businessUnit,
              serviceHandler: req.user.name,
              amount: expenseEntry.amount,
              currency: expenseEntry.currency,
              recurring: expenseEntry.recurring,
              purchaseDate: purchaseDateValue,
            }
          )
        ),
      ]);

      res.status(200).json({
        success: true,
        message: 'Cancellation request sent to MIS Manager. Please cancel the subscription manually.',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Request service disable
// @route   POST /api/service-handler/disable/:entryId
// @access  Private (Service Handler)
export const requestServiceDisable = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { subscriptionCancelled, reason } = req.body;

    if (!subscriptionCancelled) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm that you have cancelled the subscription manually',
      });
    }

    const expenseEntry = await ExpenseEntry.findById(entryId);

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    // Verify service handler (case-insensitive) and business unit
    if (expenseEntry.businessUnit !== req.user.businessUnit) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to disable this service',
      });
    }
    const nameRegex = buildNamePattern(req.user.name);
    if (!nameRegex.test(expenseEntry.serviceHandler)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to disable this service',
      });
    }

    // Save cancellation log
    await RenewalLog.create({
      expenseEntry: expenseEntry._id,
      serviceHandler: req.user.name,
      action: 'Cancel',
      reason,
      renewalDate: expenseEntry.nextRenewalDate || new Date(),
    });

    // Send notification to MIS and BU Admins
    const misManagers = await User.find({ role: 'mis_manager' });
      const superAdmins = await User.find({ role: 'super_admin' });

    await Promise.all(
      misManagers.map((mis) => sendCancellationNotificationEmail(mis.email, expenseEntry, reason))
    );

    const purchaseDateValue = expenseEntry.date ? expenseEntry.date.toISOString() : null;
    const notificationData = {
      reason,
      subscriptionCancelled,
      service: expenseEntry.particulars,
      businessUnit: expenseEntry.businessUnit,
      serviceHandler: req.user.name,
      amount: expenseEntry.amount,
      currency: expenseEntry.currency,
      recurring: expenseEntry.recurring,
      purchaseDate: purchaseDateValue,
    };

    await Promise.all([
      ...misManagers.map((mis) =>
        createNotification(
          mis._id,
          'service_cancellation',
          'Service Disable Request',
          `${req.user.name} (${expenseEntry.businessUnit}) requested to disable ${expenseEntry.particulars}${
            purchaseDateValue ? ` (purchased on ${new Date(purchaseDateValue).toLocaleDateString()})` : ''
          }`,
          expenseEntry._id,
          notificationData
        )
      ),
      ...superAdmins.map((admin) =>
        createNotification(
          admin._id,
          'service_disable_request',
          'Service Disable Request',
          `${req.user.name} (${expenseEntry.businessUnit}) requested to disable ${expenseEntry.particulars}${
            purchaseDateValue ? ` (purchased on ${new Date(purchaseDateValue).toLocaleDateString()})` : ''
          }`,
          expenseEntry._id,
          notificationData
        )
      ),
    ]);

    res.status(200).json({
      success: true,
      message: 'Disable request sent to MIS Manager. The service will be marked as deactive shortly.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get my services
// @route   GET /api/service-handler/my-services
// @access  Private (Service Handler)
export const getMyServices = async (req, res) => {
  try {
    const escapedName = req.user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokens = req.user.name
      .split(' ')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = [escapedName, ...tokens].join('|');

    const services = await ExpenseEntry.find({
      businessUnit: req.user.businessUnit,
      serviceHandler: { $regex: pattern, $options: 'i' },
      entryStatus: 'Accepted',
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get renewal logs for a service (Service Handler)
// @route   GET /api/service-handler/logs/:entryId
// @access  Private (Service Handler)
export const getRenewalLogs = async (req, res) => {
  try {
    const { entryId } = req.params;

    const expenseEntry = await ExpenseEntry.findById(entryId);

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    // Verify service handler
    if (expenseEntry.businessUnit !== req.user.businessUnit) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view these logs',
      });
    }

    const nameRegex = buildNamePattern(req.user.name);
    if (!nameRegex.test(expenseEntry.serviceHandler)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view these logs',
      });
    }

    const logs = await RenewalLog.find({ expenseEntry: entryId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get renewal logs (Admins/MIS/Super)
// @route   GET /api/service-handler/admin/logs/:entryId
// @access  Private (Super Admin, MIS, BU Admin)
export const getRenewalLogsAdmin = async (req, res) => {
  try {
    const { entryId } = req.params;
    const expenseEntry = await ExpenseEntry.findById(entryId);

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    // BU Admin restriction
    if (
      req.user.role === 'business_unit_admin' &&
      expenseEntry.businessUnit !== req.user.businessUnit
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view these logs',
      });
    }

    const logs = await RenewalLog.find({ expenseEntry: entryId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  respondToRenewal,
  requestServiceDisable,
  getMyServices,
  getRenewalLogs,
  getRenewalLogsAdmin,
};
