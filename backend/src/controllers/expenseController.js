import ExpenseEntry from '../models/ExpenseEntry.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { generateApprovalToken } from '../utils/jwt.js';
import { sendApprovalEmail, sendBUEntryNoticeEmail, sendMISNotificationEmail } from '../services/emailService.js';
import { convertToINR } from '../services/currencyService.js';
import RenewalLog from '../models/RenewalLog.js';

const validateSharedAllocations = (isShared, sharedAllocations = [], totalAmount, primaryBU) => {
  if (!isShared) return { isShared: false, sharedAllocations: [] };
  const cleaned = (sharedAllocations || [])
    .map((item) => ({
      businessUnit: item.businessUnit,
      amount: Number(item.amount) || 0,
    }))
    .filter((item) => item.businessUnit && item.amount > 0);

  // Ensure primary BU appears at least with 0 (optional)
  const hasPrimary = cleaned.some((item) => item.businessUnit === primaryBU);
  if (!hasPrimary) {
    cleaned.push({ businessUnit: primaryBU, amount: 0 });
  }

  const total = cleaned.reduce((sum, item) => sum + item.amount, 0);
  if (total > Number(totalAmount || 0)) {
    throw new Error('Shared allocations exceed total amount');
  }

  return { isShared: true, sharedAllocations: cleaned };
};

const parseFilterDate = (value, endOfDay = false) => {
  if (!value) return undefined;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('-');
    const iso = `${yyyy}-${mm}-${dd}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`;
    return new Date(iso);
  }
  return new Date(value);
};

// @desc    Create new expense entry
// @route   POST /api/expenses
// @access  Private (SPOC, MIS, Super Admin, Business Unit Admin)
export const createExpenseEntry = async (req, res) => {
  try {
    const {
      cardNumber,
      cardAssignedTo,
      date,
      month,
      status,
      particulars,
      narration,
      currency,
      billStatus,
      amount,
      typeOfService,
      businessUnit,
      costCenter,
      approvedBy,
      serviceHandler,
      recurring,
      isShared = false,
      sharedAllocations = [],
    } = req.body;

    // Restrict SPOC/Business Unit Admin to their own business unit
    if (['spoc', 'business_unit_admin'].includes(req.user.role)) {
      if (businessUnit !== req.user.businessUnit) {
        return res.status(403).json({
          success: false,
          message: 'You can only create entries for your assigned business unit',
        });
      }
    }

    // Get current exchange rate
    const { rate, amountInINR } = await convertToINR(amount, currency);

    // Validate shared allocations
    let sharedPayload = { isShared: false, sharedAllocations: [] };
    try {
      sharedPayload = validateSharedAllocations(isShared, sharedAllocations, amount, businessUnit);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Calculate next renewal date if recurring
    let nextRenewalDate = null;
    if (recurring === 'Monthly') {
      nextRenewalDate = new Date(date);
      nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
    } else if (recurring === 'Yearly') {
      nextRenewalDate = new Date(date);
      nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
    }

    // Check for duplicates
    const duplicateEntry = await ExpenseEntry.findOne({
      cardNumber,
      date,
      particulars,
      businessUnit,
      amount,
      currency,
    });

    let duplicateStatus = 'Unique';
    if (duplicateEntry) {
      duplicateStatus = 'Merged';
      if (duplicateEntry.duplicateStatus !== 'Merged') {
        duplicateEntry.duplicateStatus = 'Merged';
        await duplicateEntry.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Duplicate detected. Existing entry marked as merged.',
        data: duplicateEntry,
      });
    }

    // Determine entry status based on user role
    let entryStatus = 'Pending';
    let approvalToken = null;

    // Auto-approve all roles (including SPOC). SPOC now informational-only.
    if (['mis_manager', 'super_admin', 'business_unit_admin', 'spoc'].includes(req.user.role)) {
      entryStatus = 'Accepted';
    }

    // Create expense entry
    const expenseEntry = await ExpenseEntry.create({
      cardNumber,
      cardAssignedTo,
      date,
      month,
      status,
      particulars,
      narration,
      currency,
      billStatus,
      amount,
      xeRate: rate,
      amountInINR,
      typeOfService,
      businessUnit,
      costCenter,
      approvedBy,
      serviceHandler,
      recurring,
      entryStatus,
      duplicateStatus: ['mis_manager', 'super_admin'].includes(req.user.role) ? duplicateStatus : null,
      createdBy: req.user._id,
      approvalToken,
      nextRenewalDate,
      isShared: sharedPayload.isShared,
      sharedAllocations: sharedPayload.sharedAllocations,
    });

    // If SPOC entry, send approval email to Business Unit Admin
    if (req.user.role === 'spoc') {
      // Inform ALL BU admins for this business unit (no approval needed)
      const businessUnitAdmins = await User.find({
        role: 'business_unit_admin',
        businessUnit: req.user.businessUnit,
      });

      // Create informational notifications and emails (best-effort)
      await Promise.all(
        businessUnitAdmins.map(async (admin) => {
          await Notification.create({
            user: admin._id,
            type: 'entry_approved',
            title: 'New expense logged by SPOC',
            message: `${req.user.name} logged ${expenseEntry.particulars} (${expenseEntry.currency} ${expenseEntry.amount}) for ${expenseEntry.businessUnit}.`,
            relatedEntry: expenseEntry._id,
            actionRequired: false,
          });
          await sendBUEntryNoticeEmail(admin.email, expenseEntry, req.user.name);
        })
      );
    }

    // If auto-approved, notify MIS (all MIS users)
    if (entryStatus === 'Accepted') {
      const misManagers = await User.find({ role: 'mis_manager' });
      await Promise.all(
        misManagers.map((mis) => sendMISNotificationEmail(mis.email, expenseEntry, req.user.name))
      );
    }

    res.status(201).json({
      success: true,
      message: 'Expense entry created successfully',
      data: expenseEntry,
    });
  } catch (error) {
    console.error('Error creating expense entry:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all expense entries (with filters)
// @route   GET /api/expenses
// @access  Private
export const getExpenseEntries = async (req, res) => {
  try {
    const {
      businessUnit,
      cardNumber,
      status,
      date,
      month,
      typeOfService,
      serviceHandler,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      costCenter,
      approvedBy,
      recurring,
      duplicateStatus,
      disableStartDate,
      disableEndDate,
      isShared,
    } = req.query;

  let query = {};

  // Role-based filtering
  if (req.user.role === 'business_unit_admin' || req.user.role === 'spoc') {
    query.businessUnit = req.user.businessUnit;
  }

  if (req.user.role === 'service_handler') {
    query.businessUnit = req.user.businessUnit;
    const escapedName = req.user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokens = req.user.name
      .split(' ')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const patternParts = [escapedName, ...tokens];
    const pattern = patternParts.join('|');
    query.serviceHandler = { $regex: pattern, $options: 'i' };
  }

  // Apply filters
  if (businessUnit) query.businessUnit = businessUnit;
  if (cardNumber) query.cardNumber = cardNumber;
  if (status) query.status = status;
  if (month) query.month = month;
  if (typeOfService) query.typeOfService = typeOfService;
  if (serviceHandler) query.serviceHandler = serviceHandler;
  if (costCenter) query.costCenter = costCenter;
  if (approvedBy) query.approvedBy = approvedBy;
  if (recurring) query.recurring = recurring;
  if (isShared === 'true') query.isShared = true;
  if (isShared === 'false') query.isShared = false;
  if (duplicateStatus && ['Merged', 'Unique'].includes(duplicateStatus)) {
    query.duplicateStatus = duplicateStatus;
  }

  // Date range filter
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = parseFilterDate(startDate);
    if (endDate) query.date.$lte = parseFilterDate(endDate, true);
  }

  // Disable date range filter
  if (disableStartDate || disableEndDate) {
    const range = {};
    if (disableStartDate) range.$gte = parseFilterDate(disableStartDate);
    if (disableEndDate) range.$lte = parseFilterDate(disableEndDate, true);

    // Default to deactive if caller didn't choose a status
    if (!status) {
      query.status = 'Deactive';
    }

    // Match entries with disabledAt in range OR (legacy) updatedAt in range if deactivated
    const disableClauses = [];
    disableClauses.push({ disabledAt: range });
    disableClauses.push({ $and: [{ status: 'Deactive' }, { updatedAt: range }] });
    query.$or = query.$or ? [...query.$or, ...disableClauses] : disableClauses;
  }

  // Amount range filter
  if (minAmount || maxAmount) {
    query.amountInINR = {};
    if (minAmount) query.amountInINR.$gte = parseFloat(minAmount);
    if (maxAmount) query.amountInINR.$lte = parseFloat(maxAmount);
  }

  // Search filter
  if (search) {
    const searchClause = [
      { particulars: { $regex: search, $options: 'i' } },
      { narration: { $regex: search, $options: 'i' } },
      { cardNumber: { $regex: search, $options: 'i' } },
      { serviceHandler: { $regex: search, $options: 'i' } },
    ];
    query.$or = query.$or ? [...query.$or, ...searchClause] : searchClause;
  }

  // Restrict visibility: only SPOC can see their pending/rejected; others see accepted entries only
  // Skip this restriction when explicitly filtering by disable date (we already force status Deactive)
  if (req.user.role !== 'spoc' && !(disableStartDate || disableEndDate)) {
    query.entryStatus = 'Accepted';
  }

  const expenseEntries = await ExpenseEntry.find(query)
    .populate('createdBy', 'name email role')
    .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: expenseEntries.length,
      data: expenseEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single expense entry
// @route   GET /api/expenses/:id
// @access  Private
export const getExpenseEntry = async (req, res) => {
  try {
    const expenseEntry = await ExpenseEntry.findById(req.params.id).populate('createdBy', 'name email role');

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: expenseEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update expense entry
// @route   PUT /api/expenses/:id
// @access  Private (MIS, Super Admin)
export const updateExpenseEntry = async (req, res) => {
  try {
    let expenseEntry = await ExpenseEntry.findById(req.params.id);

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    const previousStatus = expenseEntry.status;

    // Shared allocation validation (if provided)
    if (req.body.isShared !== undefined || req.body.sharedAllocations !== undefined) {
      try {
        const validated = validateSharedAllocations(
          req.body.isShared ?? expenseEntry.isShared,
          req.body.sharedAllocations ?? expenseEntry.sharedAllocations,
          req.body.amount ?? expenseEntry.amount,
          req.body.businessUnit ?? expenseEntry.businessUnit
        );
        req.body.isShared = validated.isShared;
        req.body.sharedAllocations = validated.sharedAllocations;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    // If amount or currency changed, recalculate INR amount
    if (req.body.amount || req.body.currency) {
      const amount = req.body.amount || expenseEntry.amount;
      const currency = req.body.currency || expenseEntry.currency;
      const { rate, amountInINR } = await convertToINR(amount, currency);
      req.body.xeRate = rate;
      req.body.amountInINR = amountInINR;
    }

    // If status moved to Deactive, stamp disabledAt and log
    if (req.body.status === 'Deactive' && previousStatus !== 'Deactive') {
      req.body.disabledAt = new Date();
    }

    expenseEntry = await ExpenseEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Create log when MIS/Super Admin disables a service
    if (
      req.body.status === 'Deactive' &&
      previousStatus !== 'Deactive' &&
      ['mis_manager', 'super_admin'].includes(req.user.role)
    ) {
      await RenewalLog.create({
        expenseEntry: expenseEntry._id,
        serviceHandler: expenseEntry.serviceHandler,
        action: 'DisableByMIS',
        reason: req.body.disableReason || 'Disabled by MIS',
        renewalDate: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense entry updated successfully',
      data: expenseEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete expense entry
// @route   DELETE /api/expenses/:id
// @access  Private (Super Admin)
export const deleteExpenseEntry = async (req, res) => {
  try {
    const expenseEntry = await ExpenseEntry.findByIdAndDelete(req.params.id);

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense entry deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Approve expense entry (via email link)
// @route   GET /api/expenses/approve/:token
// @access  Public
export const approveExpenseEntry = async (req, res) => {
  try {
    const { token } = req.params;

    const expenseEntry = await ExpenseEntry.findOne({ approvalToken: token });

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired approval link',
      });
    }

    if (expenseEntry.entryStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This entry has already been processed',
      });
    }

    expenseEntry.entryStatus = 'Accepted';
    await expenseEntry.save();

    // Notify MIS Manager
    const misManager = await User.findOne({ role: 'mis_manager' });
    const spoc = await User.findById(expenseEntry.createdBy);

    if (misManager && spoc) {
      await sendMISNotificationEmail(misManager.email, expenseEntry, spoc.name);
    }

    res.status(200).json({
      success: true,
      message: 'Expense entry approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reject expense entry (via email link)
// @route   GET /api/expenses/reject/:token
// @access  Public
export const rejectExpenseEntry = async (req, res) => {
  try {
    const { token } = req.params;

    const expenseEntry = await ExpenseEntry.findOne({ approvalToken: token });

    if (!expenseEntry) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired approval link',
      });
    }

    if (expenseEntry.entryStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This entry has already been processed',
      });
    }

    expenseEntry.entryStatus = 'Rejected';
    await expenseEntry.save();

    res.status(200).json({
      success: true,
      message: 'Expense entry rejected successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get expense statistics
// @route   GET /api/expenses/stats
// @access  Private
export const getExpenseStats = async (req, res) => {
  try {
    let matchQuery = {};

    // Align visibility with list endpoint: only SPOC can see non-accepted entries
    if (req.user.role !== 'spoc') {
      matchQuery.entryStatus = 'Accepted';
    }

    // Role-based filtering
    if (req.user.role === 'business_unit_admin' || req.user.role === 'spoc') {
      matchQuery.businessUnit = req.user.businessUnit;
    }

    if (req.user.role === 'service_handler') {
      matchQuery.businessUnit = req.user.businessUnit;
      const escapedName = req.user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokens = req.user.name
        .split(' ')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const patternParts = [escapedName, ...tokens];
      const pattern = patternParts.join('|');
      matchQuery.serviceHandler = { $regex: pattern, $options: 'i' };
    }

    const stats = await ExpenseEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amountInINR' },
          totalEntries: { $sum: 1 },
          avgExpense: { $avg: '$amountInINR' },
        },
      },
    ]);

    const byBusinessUnit = await ExpenseEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$businessUnit',
          total: { $sum: '$amountInINR' },
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = await ExpenseEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$typeOfService',
          total: { $sum: '$amountInINR' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || { totalExpenses: 0, totalEntries: 0, avgExpense: 0 },
        byBusinessUnit,
        byType,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  createExpenseEntry,
  getExpenseEntries,
  getExpenseEntry,
  updateExpenseEntry,
  deleteExpenseEntry,
  approveExpenseEntry,
  rejectExpenseEntry,
  getExpenseStats,
};
