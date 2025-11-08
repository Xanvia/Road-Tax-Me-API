import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate, authorize } from '../middleware/authentication';
import adminService from '../services/adminService';
import submissionService from '../services/submissionService';
import paymentService from '../services/paymentService';
import taxOptionService from '../services/taxOptionService';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// GET /api/admin/dashboard/statistics
router.get('/dashboard/statistics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const statistics = await adminService.getDashboardStatistics();

    res.json({
      status: 'success',
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/dashboard/recent-submissions
router.get('/dashboard/recent-submissions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const submissions = await submissionService.getRecentSubmissions(10);

    res.json({
      status: 'success',
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/submissions
router.get('/submissions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const offset = (page - 1) * limit;

    const { submissions, total } = await submissionService.getAllSubmissions(limit, offset, {
      status,
      search,
    });

    res.json({
      status: 'success',
      data: submissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/submissions/:id
router.get('/submissions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const submission = await submissionService.getSubmissionById(id);

    if (!submission) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found',
      });
    }

    res.json({
      status: 'success',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/submissions/:id
router.patch('/submissions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (status && !['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value',
      });
    }

    const submission = await submissionService.updateSubmission(id, {
      status,
      adminNotes: notes,
    });

    if (!submission) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found',
      });
    }

    res.json({
      status: 'success',
      data: submission,
      message: 'Submission updated',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/submissions/:id
router.delete('/submissions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deleted = await submissionService.deleteSubmission(id);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found',
      });
    }

    res.json({
      status: 'success',
      message: 'Submission deleted',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/payments
router.get('/payments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const offset = (page - 1) * limit;

    const { payments, total } = await paymentService.getAllPayments(limit, offset, {
      status,
    });

    res.json({
      status: 'success',
      data: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/payments/:id
router.get('/payments/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payment = await paymentService.getPaymentBySubmission(id);

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found',
      });
    }

    res.json({
      status: 'success',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/payments/:id/refund
router.post('/payments/:id/refund', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Refund reason is required',
      });
    }

    await paymentService.initiateRefund(id, reason);

    res.json({
      status: 'success',
      message: 'Refund initiated',
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found')) {
      return res.status(404).json({
        status: 'error',
        message: err.message,
      });
    }
    if (err.message.includes('Only completed')) {
      return res.status(400).json({
        status: 'error',
        message: err.message,
      });
    }
    next(error);
  }
});

// GET /api/admin/tax-options
router.get('/tax-options', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taxOptions = await taxOptionService.getAllTaxOptions(false);

    res.json({
      status: 'success',
      data: taxOptions,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/tax-options
router.post('/tax-options', authorize('super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { duration, price, description, isActive, displayOrder } = req.body;

    if (!duration || !price) {
      return res.status(400).json({
        status: 'error',
        message: 'duration and price are required',
      });
    }

    const taxOption = await taxOptionService.createTaxOption({
      duration,
      price,
      description,
      isActive,
      displayOrder,
    });

    res.status(201).json({
      status: 'success',
      data: taxOption,
      message: 'Tax option created',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/tax-options/:id
router.put('/tax-options/:id', authorize('super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const taxOption = await taxOptionService.updateTaxOption(id, updates);

    if (!taxOption) {
      return res.status(404).json({
        status: 'error',
        message: 'Tax option not found',
      });
    }

    res.json({
      status: 'success',
      data: taxOption,
      message: 'Tax option updated',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/tax-options/:id
router.delete('/tax-options/:id', authorize('super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deleted = await taxOptionService.deleteTaxOption(id);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Tax option not found',
      });
    }

    res.json({
      status: 'success',
      message: 'Tax option deleted',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/admins
router.get('/admins', authorize('super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const admins = await adminService.getAllAdmins();

    res.json({
      status: 'success',
      data: admins,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/admins
router.post('/admins', authorize('super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        status: 'error',
        message: 'email, password, firstName, and lastName are required',
      });
    }

    const admin = await adminService.createAdmin({
      email,
      password,
      firstName,
      lastName,
    });

    res.status(201).json({
      status: 'success',
      data: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
      message: 'Admin created',
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('already exists')) {
      return res.status(409).json({
        status: 'error',
        message: err.message,
      });
    }
    next(error);
  }
});

// PUT /api/admin/admins/:id
router.put('/admins/:id', authorize('super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const admin = await adminService.updateAdmin(id, updates);

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
      },
      message: 'Admin updated',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/admins/:id
router.delete('/admins/:id', authorize('super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deleted = await adminService.deleteAdmin(id);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Admin not found',
      });
    }

    res.json({
      status: 'success',
      message: 'Admin deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
