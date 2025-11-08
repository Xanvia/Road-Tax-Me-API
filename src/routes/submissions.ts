import { Router, Request, Response, NextFunction } from 'express';
import submissionService from '../services/submissionService';
import vehicleService from '../services/vehicleService';
import taxOptionService from '../services/taxOptionService';
import logger from '../utils/logger';

const router = Router();

// POST /api/submissions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId, taxOptionId, userContact } = req.body;

    // Validate required fields
    if (!vehicleId || !taxOptionId || !userContact) {
      return res.status(400).json({
        status: 'error',
        message: 'vehicleId, taxOptionId, and userContact are required',
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

    // Validate tax option exists
    const taxOption = await taxOptionService.getTaxOptionById(taxOptionId);
    if (!taxOption) {
      return res.status(404).json({
        status: 'error',
        message: 'Tax option not found',
      });
    }

    // Create submission
    const submission = await submissionService.createSubmission({
      vehicleId,
      taxOptionId,
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
