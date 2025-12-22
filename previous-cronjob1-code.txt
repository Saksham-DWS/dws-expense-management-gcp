import cron from 'node-cron';
import ExpenseEntry from '../models/ExpenseEntry.js';
import User from '../models/User.js';
import { sendRenewalReminderEmail, sendAutoCancellationNoticeEmail } from './emailService.js';
import { getExchangeRate } from './currencyService.js';
import { createNotification } from '../controllers/notificationController.js';
import RenewalLog from '../models/RenewalLog.js';

// Move an entry's renewal date forward until it is in the future.
// Resets reminder/auto-cancel flags so the new cycle can notify properly.
const advanceNextRenewalDate = (entry) => {
  if (!entry?.nextRenewalDate) return false;
  const now = new Date();
  let nextDate = new Date(entry.nextRenewalDate);
  const original = nextDate.getTime();

  if (entry.recurring === 'Monthly') {
    while (nextDate < now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
  } else if (entry.recurring === 'Yearly') {
    while (nextDate < now) {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
  } else {
    return false;
  }

  if (nextDate.getTime() !== original) {
    entry.nextRenewalDate = nextDate;
    entry.renewalNotificationSent = false;
    entry.autoCancellationNotificationSent = false;
    return true;
  }
  return false;
};

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
export const scheduleRenewalReminders = () => {
  // Run every day at 2:00 PM
  cron.schedule('0 14 * * *', async () => {
    try {
      console.log('Running renewal reminder cron job...');

      // Catch up missed cycles (handler not created, reminder not sent) so future reminders resume
      const overdueEntries = await ExpenseEntry.find({
        nextRenewalDate: { $lt: new Date() },
        status: 'Active',
        entryStatus: 'Accepted',
        recurring: { $in: ['Monthly', 'Yearly'] },
      });
      for (const entry of overdueEntries) {
        const advanced = advanceNextRenewalDate(entry);
        if (advanced) {
          await entry.save();
        }
      }

      const reminderDays = parseInt(process.env.RENEWAL_NOTIFICATION_DAYS) || 5;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + reminderDays);

      // Find services due for renewal
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
        // Skip if already acted on for this cycle
        const alreadyHandled = await hasRenewalAction(entry._id, entry.nextRenewalDate);
        if (alreadyHandled) {
          continue;
        }

        // Find service handler
        const serviceHandler = await User.findOne({
          name: buildNamePattern(entry.serviceHandler),
          role: 'service_handler',
          businessUnit: entry.businessUnit,
        });

        if (serviceHandler) {
          // Send email
          await sendRenewalReminderEmail(serviceHandler.email, entry);

          // Create notification
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

          // Mark as sent
          entry.renewalNotificationSent = true;
          await entry.save();

          console.log(`Renewal reminder sent for ${entry.particulars} to ${serviceHandler.email}`);
        }
      }

      console.log('Renewal reminder cron job completed');
    } catch (error) {
      console.error('Error in renewal reminder cron job:', error);
    }
  });
};

// Auto-delete rejected entries after specified days
export const scheduleRejectedEntriesCleanup = () => {
  // Run every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running rejected entries cleanup cron job...');

      const deleteDays = parseInt(process.env.AUTO_DELETE_REJECTED_DAYS) || 3;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deleteDays);

      const result = await ExpenseEntry.deleteMany({
        entryStatus: 'Rejected',
        updatedAt: { $lte: cutoffDate },
      });

      console.log(`Deleted ${result.deletedCount} rejected entries older than ${deleteDays} days`);
    } catch (error) {
      console.error('Error in rejected entries cleanup cron job:', error);
    }
  });
};

// Reset renewal notification flag for renewed services
export const scheduleRenewalFlagReset = () => {
  // Run every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('Running renewal flag reset cron job...');

      // Reset flag for services that have passed their renewal date
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
    } catch (error) {
      console.error('Error in renewal flag reset cron job:', error);
    }
  });
};

// Refresh XE rates and INR amounts daily to keep displayed conversion current
export const scheduleExchangeRateRefresh = () => {
  // Run every day at 1:30 AM
  cron.schedule('30 1 * * *', async () => {
    try {
      console.log('Running exchange rate refresh job...');

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
    } catch (error) {
      console.error('Error refreshing exchange rates:', error);
    }
  });
};

// Send auto-cancel notices 2 days before renewal if no response
export const scheduleAutoCancellationNotices = () => {
  cron.schedule('0 10 * * *', async () => {
    try {
      console.log('Running auto-cancellation notice cron job...');
      const daysBefore = parseInt(process.env.AUTO_CANCEL_DAYS_BEFORE) || 2;
      const target = new Date();
      target.setDate(target.getDate() + daysBefore);
      const start = new Date(target);
      start.setHours(0, 0, 0, 0);
      const end = new Date(target);
      end.setHours(23, 59, 59, 999);

      // Find services approaching renewal with no handler response
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
        // Check if a renewal log already exists for this cycle
        const priorResponse = await hasRenewalAction(entry._id, entry.nextRenewalDate);
        if (priorResponse) continue;

        // Find service handler user by name
        const handlerUser = await User.findOne({
          name: buildNamePattern(entry.serviceHandler),
          role: 'service_handler',
          businessUnit: entry.businessUnit,
        });

        // Email handler (if found) and MIS
        if (handlerUser) {
          await sendAutoCancellationNoticeEmail(handlerUser.email, entry, daysBefore);
        }
        await Promise.all(
          misManagers.map((mis) => sendAutoCancellationNoticeEmail(mis.email, entry, daysBefore))
        );

        // Notify MIS & Super Admin internally
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

        // Mark as sent to avoid duplicates
        entry.autoCancellationNotificationSent = true;
        await entry.save();
      }
      console.log('Auto-cancellation notice cron job completed');
    } catch (error) {
      console.error('Error in auto-cancellation notice cron job:', error);
    }
  });
};

// Initialize all cron jobs
export const initializeCronJobs = () => {
  console.log('Initializing cron jobs...');
  scheduleRenewalReminders();
  scheduleRejectedEntriesCleanup();
  scheduleRenewalFlagReset();
  scheduleExchangeRateRefresh();
  scheduleAutoCancellationNotices();
  console.log('Cron jobs initialized successfully');
};

export default {
  initializeCronJobs,
  scheduleRenewalReminders,
  scheduleRejectedEntriesCleanup,
  scheduleRenewalFlagReset,
  scheduleExchangeRateRefresh,
};
