import axios from 'axios';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  bcc?: string;
}

class EmailService {
  private resendApiKey = process.env.RESEND_API_KEY || '';
  private fromEmail = process.env.FROM_EMAIL || 'noreply@roadtaxme.com';

  /**
   * Send email using Resend API
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.resendApiKey) {
        console.error('❌ RESEND_API_KEY is not configured');
        return { success: false, error: 'Email service not configured' };
      }

      const emailPayload: any = {
        from: payload.from || this.fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      };

      // Add BCC if provided, otherwise use default
      if (payload.bcc) {
        emailPayload.bcc = payload.bcc;
      } else {
        emailPayload.bcc = 'martin@roadtaxme.co.uk';
      }

      const response = await axios.post(
        'https://api.resend.com/emails',
        emailPayload,
        {
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log(`✅ Email sent successfully to ${payload.to}`, response.data);
      return { success: true, messageId: response.data.id };
    } catch (error: any) {
      console.error('❌ Error sending email:', error.message);
      if (error.response?.data) {
        console.error('Resend API Error:', JSON.stringify(error.response.data, null, 2));
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment success email
   */
  async sendPaymentSuccessEmail(
    userEmail: string,
    userName: string,
    amount: number,
    currency: string,
    submissionId: string,
    vehicleId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = this.getPaymentSuccessTemplate(userName, amount, currency, submissionId, vehicleId);
    return this.sendEmail({
      to: userEmail,
      subject: '✅ Payment Successful - Road Tax Me',
      html,
    });
  }

  /**
   * Send payment failure email
   */
  async sendPaymentFailureEmail(
    userEmail: string,
    userName: string,
    amount: number,
    currency: string,
    submissionId: string,
    failureReason?: string,
    vehicleId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = this.getPaymentFailureTemplate(userName, amount, currency, submissionId, failureReason, vehicleId);
    return this.sendEmail({
      to: userEmail,
      subject: '❌ Payment Failed - Road Tax Me',
      html,
    });
  }

  /**
   * Payment success email HTML template
   */
  private getPaymentSuccessTemplate(
    userName: string,
    amount: number,
    currency: string,
    submissionId: string,
    vehicleId?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .success-badge { font-size: 48px; margin-bottom: 20px; }
            h1 { color: #27ae60; margin: 0; font-size: 28px; }
            .content { color: #333; line-height: 1.6; margin-bottom: 30px; }
            .details { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #27ae60; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .cta-button { display: inline-block; background-color: #27ae60; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://roadtaxme.co.uk/assets/logo-Lf88egCT.png" alt="Road Tax Me Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
              <h1>Payment Successful!</h1>
            </div>
            
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Your payment has been successfully processed. Your road tax submission is now complete!</p>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Amount Paid:</span>
                  <span class="detail-value">${currency} ${(amount / 100).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Submission ID:</span>
                  <span class="detail-value">${submissionId.split('-').pop()}</span>
                </div>
                ${vehicleId ? `<div class="detail-row">
                  <span class="detail-label">Vehicle ID:</span>
                  <span class="detail-value">${vehicleId}</span>
                </div>` : ''}
                <div class="detail-row">
                  <span class="detail-label">Transaction Date:</span>
                  <span class="detail-value">${new Date().toLocaleDateString()}</span>
                </div>
              </div>
              
              <p>A confirmation receipt has been attached to this email. Please keep it for your records.</p>
              
              <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>
            </div>
            
            <div class="footer">
              <p>Road Tax Me - Your trusted road tax management service</p>
              <p>&copy; ${new Date().getFullYear()} Road Tax Me. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Payment failure email HTML template
   */
  private getPaymentFailureTemplate(
    userName: string,
    amount: number,
    currency: string,
    submissionId: string,
    failureReason?: string,
    vehicleId?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .failure-badge { font-size: 48px; margin-bottom: 20px; }
            h1 { color: #e74c3c; margin: 0; font-size: 28px; }
            .content { color: #333; line-height: 1.6; margin-bottom: 30px; }
            .alert { background-color: #fadbd8; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0; border-radius: 3px; }
            .alert-title { color: #e74c3c; font-weight: bold; margin-bottom: 8px; }
            .details { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #e74c3c; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .cta-button { display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0; }
            .support-info { background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://roadtaxme.co.uk/assets/logo-Lf88egCT.png" alt="Road Tax Me Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
              <h1>Payment Failed</h1>
            </div>
            
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Unfortunately, your payment could not be processed at this time.</p>
              
              <div class="alert">
                <div class="alert-title">Payment Failed</div>
                <p>${failureReason || 'The payment was declined. Please check your payment details and try again.'}</p>
              </div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Amount:</span>
                  <span class="detail-value">${currency} ${(amount / 100).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Submission ID:</span>
                  <span class="detail-value">${submissionId.split('-').pop()}</span>
                </div>
                ${vehicleId ? `<div class="detail-row">
                  <span class="detail-label">Vehicle ID:</span>
                  <span class="detail-value">${vehicleId}</span>
                </div>` : ''}
                <div class="detail-row">
                  <span class="detail-label">Failed Date:</span>
                  <span class="detail-value">${new Date().toLocaleDateString()}</span>
                </div>
              </div>
              
              <h3>What you can do:</h3>
              <ul>
                <li>Check that your card details are correct</li>
                <li>Ensure you have sufficient funds</li>
                <li>Try again with a different payment method</li>
                <li>Contact your bank to verify there are no restrictions</li>
              </ul>
              
              <div class="support-info">
                <strong>Need help?</strong><br>
                If you continue to experience issues, our support team is here to help. Please reply to this email or contact us at support@roadtaxme.com
              </div>
              
              <p>We appreciate your patience and look forward to assisting you.</p>
            </div>
            
            <div class="footer">
              <p>Road Tax Me - Your trusted road tax management service</p>
              <p>&copy; ${new Date().getFullYear()} Road Tax Me. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export default new EmailService();
