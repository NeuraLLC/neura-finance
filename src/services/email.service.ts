import { Resend } from 'resend';
import { Merchant } from './merchants.service';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface WelcomeEmailData {
  businessName: string;
  dashboardUrl: string;
}

class EmailService {
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly baseUrl: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'onboarding@neurafinance.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Neura Finance';
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // Initialize Resend if API key is available
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      this.resend = null;
      console.warn('⚠️  RESEND_API_KEY not configured - emails will only be logged to console');
    }
  }

  /**
   * Send email using Resend
   */
  private async sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
    try {
      if (this.resend) {
        // Send email via Resend
        const { data, error } = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to,
          subject,
          html,
          text,
        });

        if (error) {
          console.error('❌ Failed to send email:', error);
          throw new Error(`Email send failed: ${error.message}`);
        }

        console.log(`✅ Email sent successfully to ${to} (ID: ${data?.id})`);
      } else {
        // Development mode: just log the email
        console.log('📧 [DEV MODE] Email would be sent:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Preview: ${text.substring(0, 200)}...`);
      }
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      // Don't throw - we don't want email failures to break the app
    }
  }

  /**
   * Template: Welcome email after signup
   */
  private getWelcomeTemplate(data: WelcomeEmailData): EmailTemplate {
    const { businessName, dashboardUrl } = data;

    const subject = `Welcome to Neura Finance, ${businessName}!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin-top: 0;">Welcome to Neura Finance! 🎉</h1>
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${businessName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Your account is ready! You can start processing payments right away.
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>Important:</strong> You have 30 days to complete your account verification to receive payouts.
            Don't worry - you can start accepting payments immediately and complete verification later.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Need help? Reply to this email or visit our support center.
          </p>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center;">
          © ${new Date().getFullYear()} Neura Finance. All rights reserved.
        </p>
      </body>
      </html>
    `;

    const text = `
Welcome to Neura Finance, ${businessName}!

Your account is ready! You can start processing payments right away.

Important: You have 30 days to complete your account verification to receive payouts. Don't worry - you can start accepting payments immediately and complete verification later.

Go to your dashboard: ${dashboardUrl}

Need help? Reply to this email or visit our support center.

© ${new Date().getFullYear()} Neura Finance. All rights reserved.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(merchant: Merchant): Promise<void> {
    const data: WelcomeEmailData = {
      businessName: merchant.business_name,
      dashboardUrl: `${this.baseUrl}/dashboard`,
    };

    const template = this.getWelcomeTemplate(data);
    await this.sendEmail(merchant.business_email, template.subject, template.html, template.text);
  }
}

export default new EmailService();
