import express from 'express';
import { getLogs } from '../controllers/logController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', authorize('super_admin', 'mis_manager', 'business_unit_admin'), getLogs);

export default router;
