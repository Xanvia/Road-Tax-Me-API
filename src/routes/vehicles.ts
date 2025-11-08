import { Router, Request, Response, NextFunction } from 'express';
import dvlaService from '../services/dvlaService';
import vehicleService from '../services/vehicleService';

const router = Router();

// POST /api/vehicles/lookup
router.post('/lookup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { registrationNumber } = req.body;

    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Registration number is required',
      });
    }

    // Lookup vehicle from DVLA API
    const dvlaData = await dvlaService.lookupVehicle(registrationNumber);

    // Save/update vehicle in database
    const vehicle = await vehicleService.lookupAndSaveVehicle(registrationNumber, dvlaData);

    res.json({
      status: 'success',
      data: vehicle,
      message: 'Vehicle found and cached',
    });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'Vehicle not found') {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found',
      });
    }
    if (err.message === 'Invalid registration format') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid registration number format',
      });
    }
    next(error);
  }
});

// GET /api/vehicles/:registration
router.get('/:registration', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { registration } = req.params;

    if (!registration) {
      return res.status(400).json({
        status: 'error',
        message: 'Registration number is required',
      });
    }

    // Get cached vehicle from database
    const vehicle = await vehicleService.getVehicleByRegistration(registration);

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found. Please lookup the vehicle first.',
      });
    }

    res.json({
      status: 'success',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
