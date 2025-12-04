import axios from 'axios';
import { AppDataSource } from '../database/connection';
import { Payment } from '../entities/Payment';
import { Submission } from '../entities/Submission';
import emailService from './emailService';

export interface CreatePaymentIntentDTO {
  submissionId: string;
  amount: number;
}

class PaymentService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private submissionRepository = AppDataSource.getRepository(Submission);
  private stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  // private stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

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
        
        return {
          clientSecret: response.data.client_secret,
          paymentIntentId: response.data.id,
        };
      } catch (dbError: any) {
        // If duplicate key error, another request beat us to it
        // Fetch and return the existing payment
        if (dbError.code === '23505') {
          
          // Wait a bit and try again to ensure the other request has saved
          await new Promise(resolve => setTimeout(resolve, 100));
          
          existingPayment = await this.paymentRepository.findOne({
            where: { submissionId: data.submissionId },
          });
          
          if (existingPayment?.metadata?.client_secret) {
            return {
              clientSecret: existingPayment.metadata.client_secret,
              paymentIntentId: existingPayment.transactionId,
            };
          }
        }

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
      console.log(`\n🔔 Webhook Event Received: ${event.type}`);
      console.log(`Event ID: ${event.id}`);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          console.log('✅ Handling payment_intent.succeeded');
          await this.handlePaymentSucceeded(event.data.object);
          console.log('✅ payment_intent.succeeded handled successfully');
          break;
        case 'payment_intent.failed':
          console.log('❌ Handling payment_intent.failed');
          await this.handlePaymentFailed(event.data.object);
          console.log('❌ payment_intent.failed handled successfully');
          break;
        default:
          console.log(`⚠️  Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('❌ Error handling Stripe webhook:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    try {
      const submissionId = paymentIntent.metadata.submissionId;
      const transactionId = paymentIntent.id;
      
      console.log(`\n💳 Processing successful payment:`);
      console.log(`   Transaction ID: ${transactionId}`);
      console.log(`   Submission ID: ${submissionId}`);
      console.log(`   Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);

      // Find payment
      console.log(`🔍 Looking for payment record...`);
      const payment = await this.paymentRepository.findOne({
        where: { transactionId },
      });

      if (!payment) {
        console.error(`❌ Payment not found for transaction: ${transactionId}`);
        return;
      }

      console.log(`✅ Payment record found`);
      console.log(`   Current DB status: ${payment.status}`);

      // Update payment status
      console.log(`📝 Updating payment status to completed...`);
      payment.status = 'completed';
      payment.metadata = { ...payment.metadata, ...paymentIntent };
      await this.paymentRepository.save(payment);
      console.log(`   ✅ Payment status updated to: completed`);

      // Update submission status
      console.log(`🔍 Loading submission with user contact...`);
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['userContact'],
      });

      if (!submission) {
        console.error(`❌ Submission not found: ${submissionId}`);
        return;
      }

      console.log(`✅ Submission found`);
      console.log(`   Submission status: ${submission.status}`);
      console.log(`   Has user contact: ${!!submission.userContact}`);
      
      submission.status = 'completed';
      await this.submissionRepository.save(submission);
      console.log(`   ✅ Submission status updated to: completed`);

      // Send success email
      if (submission.userContact?.email) {
        console.log(`\n📧 Email sending initiated`);
        console.log(`   Recipient: ${submission.userContact.email}`);
        console.log(`   Name: ${submission.userContact.name}`);
        
        const emailResult = await emailService.sendPaymentSuccessEmail(
          submission.userContact.email,
          submission.userContact.name,
          paymentIntent.amount,
          paymentIntent.currency.toUpperCase(),
          submissionId
        );
        
        if (emailResult.success) {
          console.log(`✅ Success email sent with message ID: ${emailResult.messageId}`);
        } else {
          console.error(`⚠️  Failed to send success email: ${emailResult.error}`);
        }
      } else {
        console.warn(`⚠️  No email address found for submission ${submissionId}`);
        if (submission.userContact) {
          console.warn(`   UserContact exists but email is missing`);
        } else {
          console.warn(`   UserContact is null/undefined`);
        }
      }
    } catch (error) {
      console.error('❌ Error handling payment succeeded:', error);
      console.error(`Stack:`, (error as any).stack);
      throw error;
    }
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    try {
      const submissionId = paymentIntent.metadata.submissionId;
      const transactionId = paymentIntent.id;
      
      console.log(`\n❌ Processing failed payment:`);
      console.log(`   Transaction ID: ${transactionId}`);
      console.log(`   Submission ID: ${submissionId}`);
      
      // Find payment
      console.log(`🔍 Looking for payment record...`);
      const payment = await this.paymentRepository.findOne({
        where: { transactionId },
      });

      if (!payment) {
        console.error(`❌ Payment not found for transaction: ${transactionId}`);
        return;
      }

      console.log(`✅ Payment record found`);
      console.log(`   Current DB status: ${payment.status}`);

      // Update payment status
      console.log(`📝 Updating payment status to failed...`);
      payment.status = 'failed';
      payment.metadata = { ...payment.metadata, ...paymentIntent };
      await this.paymentRepository.save(payment);
      console.log(`   ✅ Payment status updated to: failed`);

      // Update submission status
      console.log(`🔍 Loading submission with user contact...`);
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['userContact'],
      });

      if (!submission) {
        console.error(`❌ Submission not found: ${submissionId}`);
        return;
      }

      console.log(`✅ Submission found`);
      console.log(`   Submission status: ${submission.status}`);
      console.log(`   Has user contact: ${!!submission.userContact}`);
      
      submission.status = 'failed';
      await this.submissionRepository.save(submission);
      console.log(`   ✅ Submission status updated to: failed`);

      // Send failure email
      if (submission.userContact?.email) {
        console.log(`\n📧 Email sending initiated`);
        console.log(`   Recipient: ${submission.userContact.email}`);
        console.log(`   Name: ${submission.userContact.name}`);
        
        const failureReason = paymentIntent.last_payment_error?.message || 'Payment was declined';
        const emailResult = await emailService.sendPaymentFailureEmail(
          submission.userContact.email,
          submission.userContact.name,
          paymentIntent.amount,
          paymentIntent.currency.toUpperCase(),
          submissionId,
          failureReason
        );
        
        if (emailResult.success) {
          console.log(`✅ Failure email sent with message ID: ${emailResult.messageId}`);
        } else {
          console.error(`⚠️  Failed to send failure email: ${emailResult.error}`);
        }
      } else {
        console.warn(`⚠️  No email address found for submission ${submissionId}`);
        if (submission.userContact) {
          console.warn(`   UserContact exists but email is missing`);
        } else {
          console.warn(`   UserContact is null/undefined`);
        }
      }
    } catch (error) {
      console.error('❌ Error handling payment failed:', error);
      console.error(`Stack:`, (error as any).stack);
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

  async getLivePaymentStatus(submissionId: string): Promise<{ 
    paymentIntentId: string;
    status: string;
    amount: number;
    currency: string;
    dbStatus: string;
    lastUpdated: Date;
  } | null> {
    try {
      // Get payment from database
      const payment = await this.paymentRepository.findOne({
        where: { submissionId },
      });

      if (!payment) {
        return null;
      }

      // Fetch LIVE status from Stripe
      const response = await axios.get(
        `https://api.stripe.com/v1/payment_intents/${payment.transactionId}`,
        {
          auth: {
            username: this.stripeSecretKey,
            password: '',
          },
          timeout: 10000,
        }
      );

      const stripePaymentIntent = response.data;
      

      // Update database if status changed
      const stripeStatus = stripePaymentIntent.status;
      let mappedStatus: 'pending' | 'completed' | 'failed' | 'refunded';

      switch (stripeStatus) {
        case 'succeeded':
          mappedStatus = 'completed';
          break;
        case 'canceled':
        case 'requires_payment_method':
          mappedStatus = 'failed';
          break;
        case 'processing':
        case 'requires_action':
        case 'requires_confirmation':
        case 'requires_capture':
          mappedStatus = 'pending';
          break;
        default:
          mappedStatus = payment.status;
      }

      // Update database if status differs
      if (mappedStatus !== payment.status) {
        payment.status = mappedStatus;
        await this.paymentRepository.save(payment);

        // Also update submission status
        const submission = await this.submissionRepository.findOne({
          where: { id: submissionId },
        });
        if (submission && mappedStatus === 'completed') {
          submission.status = 'completed';
          await this.submissionRepository.save(submission);
        }
      }

      return {
        paymentIntentId: payment.transactionId,
        status: stripeStatus,
        amount: stripePaymentIntent.amount / 100,
        currency: stripePaymentIntent.currency.toUpperCase(),
        dbStatus: payment.status,
        lastUpdated: payment.updatedAt,
      };
    } catch (error: any) {
      if (error.response) {
        console.error('Stripe API Error:', error.response.data);
      }
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
