import { Router, Request, Response, NextFunction } from 'express';
import paymentService from '../services/paymentService';
import submissionService from '../services/submissionService';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

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
// Note: This endpoint needs raw body, configured in index.ts
router.post('/webhook/stripe', async (req: Request, res: Response, next: NextFunction) => {  
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing stripe-signature header',
      });
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).json({
        status: 'error',
        message: 'Webhook secret not configured',
      });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        signature as string,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({
        status: 'error',
        message: `Webhook signature verification failed: ${err.message}`,
      });
    }

    // Process the verified event
    await paymentService.handleStripeWebhook(event);

    res.json({
      status: 'success',
      message: 'Webhook received',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/:submissionId/status - Get LIVE status from Stripe
router.get('/:submissionId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;

    const paymentStatus = await paymentService.getLivePaymentStatus(submissionId);

    if (!paymentStatus) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found',
      });
    }

    res.json({
      status: 'success',
      data: paymentStatus,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/:submissionId - Get payment from database
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
