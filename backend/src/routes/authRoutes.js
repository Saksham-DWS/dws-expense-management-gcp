import express from 'express';
import {
  getBootstrapStatus,
  bootstrapSuperAdmin,
  superAdminSignup,
  register,
  login,
  getMe,
  updateMe,
  getUsers,
  updateUser,
  deleteUser,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/bootstrap-status', getBootstrapStatus);
router.post('/bootstrap-super-admin', bootstrapSuperAdmin);
router.post('/super-admin-signup', superAdminSignup);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/register', protect, authorize('super_admin', 'business_unit_admin'), register);
router.get('/users', protect, authorize('super_admin', 'business_unit_admin'), getUsers);
router.put('/users/:id', protect, authorize('super_admin'), updateUser);
router.delete('/users/:id', protect, authorize('super_admin'), deleteUser);

export default router;
