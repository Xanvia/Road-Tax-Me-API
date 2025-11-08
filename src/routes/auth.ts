import { Router } from 'express';

const router = Router();

// POST /api/admin/auth/login
router.post('/login', async (req, res, next) => {
  try {
    // TODO: Admin login
    res.json({ status: 'success', data: { message: 'Login endpoint' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/auth/me
router.get('/me', async (req, res, next) => {
  try {
    // TODO: Get current admin
    res.json({ status: 'success', data: { message: 'Get current admin endpoint' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    // TODO: Admin logout
    res.json({ status: 'success', data: { message: 'Logout endpoint' } });
  } catch (error) {
    next(error);
  }
});

export default router;
