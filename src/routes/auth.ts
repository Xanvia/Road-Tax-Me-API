import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate } from '../middleware/authentication';
import adminService from '../services/adminService';

const router = Router();

// POST /api/admin/auth/login
router.post('/login', async (req, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const { token, admin } = await adminService.login({ email, password });

    res.json({
      status: 'success',
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
        },
      },
      message: 'Login successful',
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found') || err.message === 'Invalid credentials') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }
    if (err.message === 'Admin account is inactive') {
      return res.status(403).json({
        status: 'error',
        message: err.message,
      });
    }
    next(error);
  }
});

// GET /api/admin/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const admin = await adminService.getAdminById(req.admin.adminId);

    if (!admin) {
      return res.status(404).json({
        status: 'error',
        message: 'Admin not found',
      });
    }

    res.json({
      status: 'success',
      data: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Logout is handled on client side by clearing the token
    // Server can optionally invalidate token using token blacklist
    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
