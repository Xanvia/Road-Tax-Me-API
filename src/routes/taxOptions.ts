import { Router, Request, Response, NextFunction } from 'express';
import taxOptionService from '../services/taxOptionService';

const router = Router();

// GET /api/tax-options
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taxOptions = await taxOptionService.getActiveTaxOptions();

    res.json({
      status: 'success',
      data: taxOptions,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tax-options/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const taxOption = await taxOptionService.getTaxOptionById(id);

    if (!taxOption) {
      return res.status(404).json({
        status: 'error',
        message: 'Tax option not found',
      });
    }

    res.json({
      status: 'success',
      data: taxOption,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
