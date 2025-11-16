import axios from 'axios';
import { AppDataSource } from '../database/connection';
import { Payment } from '../entities/Payment';
import { Submission } from '../entities/Submission';

export interface CreatePaymentIntentDTO {
  submissionId: string;
  amount: number;
}

class PaymentService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private submissionRepository = AppDataSource.getRepository(Submission);
  private stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  private stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  async createPaymentIntent(data: CreatePaymentIntentDTO): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: data.submissionId },
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Check if payment already exists for this submission
      let existingPayment = await this.paymentRepository.findOne({
        where: { submissionId: data.submissionId },
      });

      if (existingPayment) {
        // If payment already exists, return existing client secret if available
        if (existingPayment.metadata?.client_secret) {
          console.log(`Returning existing payment intent for submission: ${data.submissionId}`);
          return {
            clientSecret: existingPayment.metadata.client_secret,
            paymentIntentId: existingPayment.transactionId,
          };
        }
        throw new Error('Payment already exists for this submission but no client secret found');
      }

      // Create Stripe payment intent first (before saving to DB)
      // Stripe expects form-encoded data, not JSON
      const params = new URLSearchParams();
      params.append('amount', Math.round(data.amount * 100).toString()); // Convert to cents
      params.append('currency', 'gbp');
      params.append('metadata[submissionId]', data.submissionId);

      const response = await axios.post(
        'https://api.stripe.com/v1/payment_intents',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: this.stripeSecretKey,
            password: '',
          },
          timeout: 10000,
        }
      );

      console.log(`Stripe payment intent created: ${response.data.id}`);

      // Now save to database - use try-catch to handle race conditions
      try {
        const payment = this.paymentRepository.create({
          submissionId: data.submissionId,
          amount: data.amount,
          currency: 'GBP',
          provider: 'stripe',
          transactionId: response.data.id,
          status: 'pending',
          metadata: response.data,
        });

        await this.paymentRepository.save(payment);
        console.log(`Payment record saved for submission: ${data.submissionId}`);
        
        return {
          clientSecret: response.data.client_secret,
          paymentIntentId: response.data.id,
        };
      } catch (dbError: any) {
        // If duplicate key error, another request beat us to it
        // Fetch and return the existing payment
        if (dbError.code === '23505') {
          console.log(`Race condition detected - fetching existing payment for submission: ${data.submissionId}`);
          
          // Wait a bit and try again to ensure the other request has saved
          await new Promise(resolve => setTimeout(resolve, 100));
          
          existingPayment = await this.paymentRepository.findOne({
            where: { submissionId: data.submissionId },
          });
          
          if (existingPayment?.metadata?.client_secret) {
            console.log(`Returning existing payment intent after race condition: ${existingPayment.transactionId}`);
            return {
              clientSecret: existingPayment.metadata.client_secret,
              paymentIntentId: existingPayment.transactionId,
            };
          }
        }
        
        // If not a duplicate or couldn't find existing payment, re-throw
        console.error('Database error while saving payment:', dbError);
        throw dbError;
      }
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      
      // Log detailed Stripe error information
      if (error.response) {
        console.error('Stripe API Error Details:');
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
        console.error('Headers:', error.response.headers);
      }
      
      // Throw a more informative error
      if (error.response?.data?.error) {
        throw new Error(`Stripe Error: ${error.response.data.error.message || JSON.stringify(error.response.data.error)}`);
      }
      
      throw error;
    }
  }

  async handleStripeWebhook(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    try {
      const submissionId = paymentIntent.metadata.submissionId;
      const transactionId = paymentIntent.id;

      // Find payment
      const payment = await this.paymentRepository.findOne({
        where: { transactionId },
      });

      if (!payment) {
        console.error(`Payment not found for transaction: ${transactionId}`);
        return;
      }

      // Update payment status
      payment.status = 'completed';
      await this.paymentRepository.save(payment);

      // Update submission status
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
      });

      if (submission) {
        submission.status = 'completed';
        await this.submissionRepository.save(submission);
        console.log(`Payment completed and submission updated: ${submissionId}`);
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    try {
      const submissionId = paymentIntent.metadata.submissionId;
      const transactionId = paymentIntent.id;

      // Find payment
      const payment = await this.paymentRepository.findOne({
        where: { transactionId },
      });

      if (!payment) {
        console.error(`Payment not found for transaction: ${transactionId}`);
        return;
      }

      // Update payment status
      payment.status = 'failed';
      await this.paymentRepository.save(payment);

      // Update submission status
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
      });

      if (submission) {
        submission.status = 'failed';
        await this.submissionRepository.save(submission);
        console.log(`Payment failed and submission updated: ${submissionId}`);
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }

  async getPaymentBySubmission(submissionId: string): Promise<Payment | null> {
    try {
      return await this.paymentRepository.findOne({
        where: { submissionId },
      });
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  async getAllPayments(limit: number = 10, offset: number = 0, filters?: { status?: string }): Promise<{ payments: Payment[]; total: number }> {
    try {
      let query = this.paymentRepository.createQueryBuilder('payment')
        .skip(offset)
        .take(limit)
        .orderBy('payment.createdAt', 'DESC');

      if (filters?.status) {
        query = query.andWhere('payment.status = :status', { status: filters.status });
      }

      const [payments, total] = await query.getManyAndCount();
      return { payments, total };
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  }

  async initiateRefund(paymentId: string, reason: string): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      // Update payment status to refunded
      payment.status = 'refunded';
      await this.paymentRepository.save(payment);

      // Update submission status
      const submission = await this.submissionRepository.findOne({
        where: { id: payment.submissionId },
      });

      if (submission) {
        submission.status = 'failed';
        submission.adminNotes = `Refunded. Reason: ${reason}`;
        await this.submissionRepository.save(submission);
      }

      console.log(`Refund initiated for payment: ${paymentId}`);
    } catch (error) {
      console.error('Error initiating refund:', error);
      throw error;
    }
  }
}

export default new PaymentService();
