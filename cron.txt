import cron from 'node-cron';
import ExpenseEntry from '../models/ExpenseEntry.js';
import User from '../models/User.js';
import { sendRenewalReminderEmail, sendAutoCancellationNoticeEmail } from './emailService.js';
import { getExchangeRate } from './currencyService.js';
import { createNotification } from '../controllers/notificationController.js';
import RenewalLog from '../models/RenewalLog.js';

// Build a permissive regex pattern from handler name (full + tokens)
const buildNamePattern = (name) => {
  if (!name) return undefined;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokens = name
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = [escapedName, ...tokens].join('|');
  return new RegExp(pattern, 'i');
};

// Check if a renewal action already exists for this cycle (Continue/Cancel/DisableByMIS)
const hasRenewalAction = async (entryId, renewalDate) => {
  if (!entryId || !renewalDate) return false;
  const existing = await RenewalLog.findOne({
    expenseEntry: entryId,
    renewalDate,
    action: { $in: ['Continue', 'Cancel', 'DisableByMIS'] },
  }).lean();
  return Boolean(existing);
};

// Send renewal reminders 5 days before renewal date
export const runRenewalRemindersOnce = async () => {
  console.log('Running renewal reminder job (single run)...');
  const reminderDays = parseInt(process.env.RENEWAL_NOTIFICATION_DAYS, 10) || 5;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + reminderDays);

  const upcomingRenewals = await ExpenseEntry.find({
    nextRenewalDate: {
      $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      $lte: new Date(targetDate.setHours(23, 59, 59, 999)),
    },
    status: 'Active',
    entryStatus: 'Accepted',
    renewalNotificationSent: false,
  });

  console.log(`Found ${upcomingRenewals.length} services due for renewal`);

  for (const entry of upcomingRenewals) {
    const alreadyHandled = await hasRenewalAction(entry._id, entry.nextRenewalDate);
    if (alreadyHandled) continue;

    const serviceHandler = await User.findOne({
      name: buildNamePattern(entry.serviceHandler),
      role: 'service_handler',
      businessUnit: entry.businessUnit,
    });

    if (serviceHandler) {
      await sendRenewalReminderEmail(serviceHandler.email, entry);

      await createNotification(
        serviceHandler._id,
        'renewal_reminder',
        'Service Renewal Reminder',
        `Your subscription for ${entry.particulars} is due for renewal in ${reminderDays} days`,
        entry._id,
        {
          entryId: entry._id,
          service: entry.particulars,
          businessUnit: entry.businessUnit,
          serviceHandler: entry.serviceHandler,
          nextRenewalDate: entry.nextRenewalDate,
          amount: entry.amount,
          currency: entry.currency,
        }
      );

      entry.renewalNotificationSent = true;
      await entry.save();

      console.log(`Renewal reminder sent for ${entry.particulars} to ${serviceHandler.email}`);
    }
  }

  console.log('Renewal reminder job completed');
};

export const scheduleRenewalReminders = () => {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  cron.schedule(
    '0 14 * * *',
    async () => {
      try {
        await runRenewalRemindersOnce();
      } catch (error) {
        console.error('Error in renewal reminder cron job:', error);
      }
    },
    { timezone }
  );
};

// Auto-delete rejected entries after specified days
export const runRejectedEntriesCleanupOnce = async () => {
  console.log('Running rejected entries cleanup job (single run)...');
  const deleteDays = parseInt(process.env.AUTO_DELETE_REJECTED_DAYS, 10) || 3;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - deleteDays);

  const result = await ExpenseEntry.deleteMany({
    entryStatus: 'Rejected',
    updatedAt: { $lte: cutoffDate },
  });

  console.log(`Deleted ${result.deletedCount} rejected entries older than ${deleteDays} days`);
};

export const scheduleRejectedEntriesCleanup = () => {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  cron.schedule(
    '0 2 * * *',
    async () => {
      try {
        await runRejectedEntriesCleanupOnce();
      } catch (error) {
        console.error('Error in rejected entries cleanup cron job:', error);
      }
    },
    { timezone }
  );
};

// Reset renewal notification flag for renewed services
export const runRenewalFlagResetOnce = async () => {
  console.log('Running renewal flag reset job (single run)...');

  const candidates = await ExpenseEntry.find({
    nextRenewalDate: { $lt: new Date() },
    renewalNotificationSent: true,
  });

  if (candidates.length === 0) {
    console.log('No services to reset');
    return;
  }

  const bulkOps = candidates.map((entry) => {
    let nextDate = entry.nextRenewalDate;
    if (entry.recurring === 'Monthly' && nextDate) {
      nextDate = new Date(nextDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (entry.recurring === 'Yearly' && nextDate) {
      nextDate = new Date(nextDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    return {
      updateOne: {
        filter: { _id: entry._id },
        update: {
          $set: {
            nextRenewalDate: nextDate,
            renewalNotificationSent: false,
          },
        },
      },
    };
  });

  const result = await ExpenseEntry.bulkWrite(bulkOps);
  console.log(`Reset renewal flag for ${result.modifiedCount || 0} services`);
};

export const scheduleRenewalFlagReset = () => {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  cron.schedule(
    '0 3 * * *',
    async () => {
      try {
        await runRenewalFlagResetOnce();
      } catch (error) {
        console.error('Error in renewal flag reset cron job:', error);
      }
    },
    { timezone }
  );
};

// Refresh XE rates and INR amounts daily to keep displayed conversion current
export const runExchangeRateRefreshOnce = async () => {
  console.log('Running exchange rate refresh job (single run)...');

  const currencies = await ExpenseEntry.distinct('currency');
  if (!currencies || currencies.length === 0) {
    console.log('No currencies found to refresh.');
    return;
  }

  for (const currency of currencies) {
    const rate = await getExchangeRate(currency, 'INR');
    await ExpenseEntry.updateMany(
      { currency },
      [
        {
          $set: {
            xeRate: rate,
            amountInINR: { $multiply: ['$amount', rate] },
          },
        },
      ]
    );
    console.log(`Updated XE rate for ${currency} -> INR at ${rate}`);
  }

  console.log('Exchange rate refresh job completed');
};

export const scheduleExchangeRateRefresh = () => {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  cron.schedule(
    '30 1 * * *',
    async () => {
      try {
        await runExchangeRateRefreshOnce();
      } catch (error) {
        console.error('Error refreshing exchange rates:', error);
      }
    },
    { timezone }
  );
};

// Send auto-cancel notices 2 days before renewal if no response
export const runAutoCancellationNoticesOnce = async () => {
  console.log('Running auto-cancellation notice job (single run)...');
  const daysBefore = parseInt(process.env.AUTO_CANCEL_DAYS_BEFORE, 10) || 2;
  const target = new Date();
  target.setDate(target.getDate() + daysBefore);
  const start = new Date(target);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(23, 59, 59, 999);

  const candidates = await ExpenseEntry.find({
    nextRenewalDate: { $gte: start, $lte: end },
    status: 'Active',
    entryStatus: 'Accepted',
    renewalNotificationSent: true,
    autoCancellationNotificationSent: false,
  });

  if (!candidates.length) {
    console.log('No auto-cancel candidates found.');
    return;
  }

  const misManagers = await User.find({ role: 'mis_manager' });
  const superAdmins = await User.find({ role: 'super_admin' });

  for (const entry of candidates) {
    const priorResponse = await hasRenewalAction(entry._id, entry.nextRenewalDate);
    if (priorResponse) continue;

    const handlerUser = await User.findOne({
      name: buildNamePattern(entry.serviceHandler),
      role: 'service_handler',
      businessUnit: entry.businessUnit,
    });

    if (handlerUser) {
      await sendAutoCancellationNoticeEmail(handlerUser.email, entry, daysBefore);
    }
    await Promise.all(
      misManagers.map((mis) => sendAutoCancellationNoticeEmail(mis.email, entry, daysBefore))
    );

    const notifPayload = {
      reason: 'No response to renewal reminder',
      service: entry.particulars,
      businessUnit: entry.businessUnit,
      serviceHandler: entry.serviceHandler,
      purchaseDate: entry.date,
      nextRenewalDate: entry.nextRenewalDate,
      amount: entry.amount,
      currency: entry.currency,
      recurring: entry.recurring,
    };

    await Promise.all([
      ...misManagers.map((mis) =>
        createNotification(
          mis._id,
          'service_cancellation',
          'Auto-cancel requested',
          `No response from ${entry.serviceHandler} for ${entry.particulars} (renewal in ${daysBefore} days)`,
          entry._id,
          notifPayload
        )
      ),
      ...superAdmins.map((admin) =>
        createNotification(
          admin._id,
          'service_cancellation',
          'Auto-cancel requested',
          `No response from ${entry.serviceHandler} for ${entry.particulars} (renewal in ${daysBefore} days)`,
          entry._id,
          notifPayload
        )
      ),
    ]);

    entry.autoCancellationNotificationSent = true;
    await entry.save();
  }
  console.log('Auto-cancellation notice job completed');
};

export const scheduleAutoCancellationNotices = () => {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  cron.schedule(
    '0 10 * * *',
    async () => {
      try {
        await runAutoCancellationNoticesOnce();
      } catch (error) {
        console.error('Error in auto-cancellation notice cron job:', error);
      }
    },
    { timezone }
  );
};

// Initialize all cron jobs
export const initializeCronJobs = () => {
  if (process.env.ENABLE_IN_APP_CRON === 'true') {
    console.log('Initializing in-app cron jobs...');
    scheduleRenewalReminders();
    scheduleRejectedEntriesCleanup();
    scheduleRenewalFlagReset();
    scheduleExchangeRateRefresh();
    scheduleAutoCancellationNotices();
    console.log('Cron jobs initialized successfully');
  } else {
    console.log('In-app cron disabled. Use Cloud Scheduler to trigger handlers.');
  }
};

export default {
  initializeCronJobs,
  scheduleRenewalReminders,
  scheduleRejectedEntriesCleanup,
  scheduleRenewalFlagReset,
  scheduleExchangeRateRefresh,
  scheduleAutoCancellationNotices,
  runRenewalRemindersOnce,
  runRejectedEntriesCleanupOnce,
  runRenewalFlagResetOnce,
  runExchangeRateRefreshOnce,
  runAutoCancellationNoticesOnce,
};
