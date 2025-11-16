import { Router } from 'express';
import vehicleRoutes from './vehicles';
import submissionRoutes from './submissions';
import paymentRoutes from './payments';
import authRoutes from './auth';
import adminRoutes from './admin';

const router = Router();

// Public routes
router.use('/vehicles', vehicleRoutes);
router.use('/submissions', submissionRoutes);
router.use('/payments', paymentRoutes);

// Admin routes
router.use('/admin/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;
