import express from 'express';
import {
  runRenewalRemindersOnce,
  runRejectedEntriesCleanupOnce,
  runRenewalFlagResetOnce,
  runExchangeRateRefreshOnce,
  runAutoCancellationNoticesOnce,
} from '../services/cronJobs.js';

const router = express.Router();

// Simple header-based guard for Scheduler. If CRON_SECRET is set, require it.
const verifyCronAuth = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const token = req.get('x-cron-token');
    if (token !== secret) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron caller' });
    }
  }
  return next();
};

const wrap = (fn) => async (req, res) => {
  try {
    await fn();
    return res.sendStatus(204);
  } catch (error) {
    console.error('Cron handler error:', error);
    return res.status(500).json({ success: false, message: 'Cron handler failed' });
  }
};

router.post('/renewal-reminders', verifyCronAuth, wrap(runRenewalRemindersOnce));
router.post('/rejected-cleanup', verifyCronAuth, wrap(runRejectedEntriesCleanupOnce));
router.post('/renewal-flag-reset', verifyCronAuth, wrap(runRenewalFlagResetOnce));
router.post('/exchange-refresh', verifyCronAuth, wrap(runExchangeRateRefreshOnce));
router.post('/auto-cancel', verifyCronAuth, wrap(runAutoCancellationNoticesOnce));

export default router;
