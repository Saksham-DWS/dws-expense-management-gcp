import express from 'express';
import {
  respondToRenewal,
  requestServiceDisable,
  getMyServices,
  getRenewalLogs,
  getRenewalLogsAdmin,
} from '../controllers/serviceHandlerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Service handler routes
router.get('/my-services', authorize('service_handler'), getMyServices);
router.get('/logs/:entryId', authorize('service_handler'), getRenewalLogs);
router.post('/renewal-response/:entryId', authorize('service_handler'), respondToRenewal);
router.post('/disable/:entryId', authorize('service_handler'), requestServiceDisable);

// Admin/MIS routes for viewing logs
router.get(
  '/admin/logs/:entryId',
  authorize('super_admin', 'mis_manager', 'business_unit_admin'),
  getRenewalLogsAdmin
);

export default router;
