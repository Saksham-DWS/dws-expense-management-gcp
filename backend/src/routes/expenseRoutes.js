import express from 'express';
import {
  createExpenseEntry,
  getExpenseEntries,
  getExpenseEntry,
  updateExpenseEntry,
  deleteExpenseEntry,
  approveExpenseEntry,
  rejectExpenseEntry,
  getExpenseStats,
} from '../controllers/expenseController.js';
import {
  bulkUploadExpenses,
  downloadTemplate,
  exportExpenses,
} from '../controllers/bulkUploadController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

// Public routes (for email approval links)
router.get('/approve/:token', approveExpenseEntry);
router.get('/reject/:token', rejectExpenseEntry);

// Protected routes
router.use(protect);

router
  .route('/')
  .get(getExpenseEntries)
  .post(authorize('spoc', 'mis_manager', 'super_admin', 'business_unit_admin'), createExpenseEntry);

router.get('/stats', getExpenseStats);
router.get('/template', authorize('mis_manager', 'super_admin'), downloadTemplate);
router.get('/export', exportExpenses);

router.post(
  '/bulk-upload',
  authorize('mis_manager', 'super_admin'),
  upload.single('file'),
  bulkUploadExpenses
);

router
  .route('/:id')
  .get(getExpenseEntry)
  .put(authorize('mis_manager', 'super_admin'), updateExpenseEntry)
  .delete(authorize('super_admin'), deleteExpenseEntry);

export default router;
