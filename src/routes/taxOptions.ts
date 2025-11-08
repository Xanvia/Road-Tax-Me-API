import { Router } from 'express';

const router = Router();

// GET /api/tax-options
router.get('/', async (req, res, next) => {
  try {
    // TODO: Get all tax options
    res.json({ status: 'success', data: { message: 'Get all tax options endpoint' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/tax-options/:id
router.get('/:id', async (req, res, next) => {
  try {
    // TODO: Get single tax option
    res.json({ status: 'success', data: { message: 'Get single tax option endpoint' } });
  } catch (error) {
    next(error);
  }
});

export default router;
