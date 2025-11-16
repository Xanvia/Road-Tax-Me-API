import { Router, Request, Response, NextFunction } from 'express';
import submissionService from '../services/submissionService';
import vehicleService from '../services/vehicleService';

const router = Router();

// POST /api/submissions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId, taxPreference, userContact } = req.body;

    // Validate required fields
    if (!vehicleId || !taxPreference || !userContact) {
      return res.status(400).json({
        status: 'error',
        message: 'vehicleId, taxPreference, and userContact are required',
      });
    }

    // Validate taxPreference is 1, 2, or 3
    if (![1, 2, 3].includes(taxPreference)) {
      return res.status(400).json({
        status: 'error',
        message: 'taxPreference must be 1, 2, or 3',
      });
    }

    if (!userContact.name || !userContact.email || !userContact.whatsapp) {
      return res.status(400).json({
        status: 'error',
        message: 'User contact must include name, email, and whatsapp',
      });
    }

    // Validate vehicle exists
    const vehicle = await vehicleService.getVehicleById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found',
      });
    }

    // Create submission
    const submission = await submissionService.createSubmission({
      vehicleId,
      taxPreference,
      userContact,
      userIpAddress: req.ip,
      sessionId: req.headers['x-session-id'] as string,
    });

    res.status(201).json({
      status: 'success',
      data: submission,
      message: 'Submission created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/submissions/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

// GET /api/submissions/:id/status
router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const status = await submissionService.getSubmissionStatus(id);

    if (!status) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found',
      });
    }

    res.json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
