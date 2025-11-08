import { Router, Request, Response, NextFunction } from 'express';
import paymentService from '../services/paymentService';
import submissionService from '../services/submissionService';

const router = Router();

// POST /api/payments/create-intent
router.post('/create-intent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId, amount } = req.body;

    if (!submissionId || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'submissionId and amount are required',
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'amount must be a positive number',
      });
    }

    // Verify submission exists
    const submission = await submissionService.getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found',
      });
    }

    const paymentIntent = await paymentService.createPaymentIntent({
      submissionId,
      amount,
    });

    res.status(201).json({
      status: 'success',
      data: paymentIntent,
      message: 'Payment intent created',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/webhook/stripe
router.post('/webhook/stripe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;

    // In production, verify webhook signature
    // const signature = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(
    //   req.body,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET
    // );

    await paymentService.handleStripeWebhook(event);

    res.json({
      status: 'success',
      message: 'Webhook received',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/:submissionId
router.get('/:submissionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;

    const payment = await paymentService.getPaymentBySubmission(submissionId);

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

export default router;
