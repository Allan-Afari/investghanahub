/**
 * Email Service for InvestGhanaHub
 * Handles all email notifications using Nodemailer
 */

import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
const emailTemplates = {
  // Welcome email after registration
  welcome: (firstName: string) => ({
    subject: '🇬🇭 Welcome to InvestGhanaHub!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbbf24; margin: 0;">InvestGhanaHub</h1>
          <p style="color: #94a3b8; margin-top: 5px;">Ghana's Premier Investment Platform</p>
        </div>
        
        <h2 style="color: #f8fafc;">Welcome, ${firstName}! 🎉</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6;">
          Thank you for joining InvestGhanaHub. You're now part of Ghana's growing investment community.
        </p>
        
        <p style="color: #cbd5e1; line-height: 1.6;">
          <strong>Next Steps:</strong>
        </p>
        
        <ol style="color: #cbd5e1; line-height: 1.8;">
          <li>Complete your KYC verification</li>
          <li>Browse investment opportunities</li>
          <li>Start building your portfolio</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/kyc" style="background: linear-gradient(to right, #fbbf24, #f59e0b); color: #0f172a; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
            Complete KYC Now
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          InvestGhanaHub - Invest in Ghana's Future<br>
          If you didn't create this account, please ignore this email.
        </p>
      </div>
    `
  }),

  // KYC Approved email
  kycApproved: (firstName: string) => ({
    subject: '✅ KYC Approved - You Can Now Invest!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbbf24; margin: 0;">InvestGhanaHub</h1>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 80px; height: 80px; background: #22c55e20; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">✅</span>
          </div>
        </div>
        
        <h2 style="color: #22c55e; text-align: center;">KYC Verified!</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6; text-align: center;">
          Congratulations ${firstName}! Your identity has been verified and you can now make investments on InvestGhanaHub.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/investor" style="background: linear-gradient(to right, #22c55e, #16a34a); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
            Start Investing
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          InvestGhanaHub - Invest in Ghana's Future
        </p>
      </div>
    `
  }),

  // KYC Rejected email
  kycRejected: (firstName: string, reason: string) => ({
    subject: '❌ KYC Verification Unsuccessful',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbbf24; margin: 0;">InvestGhanaHub</h1>
        </div>
        
        <h2 style="color: #ef4444;">KYC Verification Unsuccessful</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6;">
          Hi ${firstName}, unfortunately your KYC verification was not successful.
        </p>
        
        <div style="background: #ef444420; border: 1px solid #ef444450; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #fca5a5; margin: 0;"><strong>Reason:</strong> ${reason}</p>
        </div>
        
        <p style="color: #cbd5e1; line-height: 1.6;">
          Please review your information and resubmit your KYC application.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/kyc" style="background: #334155; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
            Resubmit KYC
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          Need help? Contact support@investghanahub.com
        </p>
      </div>
    `
  }),

  // Password Reset email
  passwordReset: (firstName: string, resetLink: string) => ({
    subject: '🔐 Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbbf24; margin: 0;">InvestGhanaHub</h1>
        </div>
        
        <h2 style="color: #f8fafc;">Reset Your Password</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6;">
          Hi ${firstName}, we received a request to reset your password. Click the button below to create a new password.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(to right, #fbbf24, #f59e0b); color: #0f172a; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, please ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          InvestGhanaHub - Invest in Ghana's Future
        </p>
      </div>
    `
  }),

  // Investment Confirmation email
  investmentConfirmation: (firstName: string, amount: number, opportunityTitle: string, businessName: string) => ({
    subject: '💰 Investment Confirmed!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbbf24; margin: 0;">InvestGhanaHub</h1>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 50px;">💰</span>
        </div>
        
        <h2 style="color: #22c55e; text-align: center;">Investment Successful!</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6; text-align: center;">
          Hi ${firstName}, your investment has been confirmed.
        </p>
        
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <table style="width: 100%; color: #cbd5e1;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Amount:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">₵${amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Opportunity:</td>
              <td style="padding: 8px 0; text-align: right;">${opportunityTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Business:</td>
              <td style="padding: 8px 0; text-align: right;">${businessName}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/investor" style="background: #334155; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
            View Portfolio
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          InvestGhanaHub - Invest in Ghana's Future
        </p>
      </div>
    `
  }),

  // Deposit Confirmation email
  depositConfirmation: (firstName: string, amount: number, reference: string) => ({
    subject: '✅ Deposit Successful',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbbf24; margin: 0;">InvestGhanaHub</h1>
        </div>
        
        <h2 style="color: #22c55e; text-align: center;">Deposit Successful!</h2>
        
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <table style="width: 100%; color: #cbd5e1;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Amount:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">₵${amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Reference:</td>
              <td style="padding: 8px 0; text-align: right;">${reference}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Status:</td>
              <td style="padding: 8px 0; text-align: right; color: #22c55e;">Completed</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #cbd5e1; text-align: center;">
          Your wallet has been credited. Happy investing!
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          InvestGhanaHub - Invest in Ghana's Future
        </p>
      </div>
    `
  }),

  // OTP Code email
  otpCode: (firstName: string, code: string, purpose: string) => ({
    subject: `🔑 Your Verification Code: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbbf24; margin: 0;">InvestGhanaHub</h1>
        </div>
        
        <h2 style="color: #f8fafc; text-align: center;">Verification Code</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6; text-align: center;">
          Hi ${firstName}, use this code to ${purpose}:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background: #1e293b; padding: 20px 40px; border-radius: 12px; border: 2px dashed #fbbf24;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #fbbf24;">${code}</span>
          </div>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          This code expires in 10 minutes. Do not share it with anyone.
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  }),
};

/**
 * Email Service Class
 */
class EmailService {
  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    try {
      const template = emailTemplates.welcome(firstName);
      await transporter.sendMail({
        from: `"InvestGhanaHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      console.log(`✉️ Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Send KYC approved email
   */
  async sendKYCApprovedEmail(email: string, firstName: string): Promise<boolean> {
    try {
      const template = emailTemplates.kycApproved(firstName);
      await transporter.sendMail({
        from: `"InvestGhanaHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      console.log(`✉️ KYC approved email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send KYC approved email:', error);
      return false;
    }
  }

  /**
   * Send KYC rejected email
   */
  async sendKYCRejectedEmail(email: string, firstName: string, reason: string): Promise<boolean> {
    try {
      const template = emailTemplates.kycRejected(firstName, reason);
      await transporter.sendMail({
        from: `"InvestGhanaHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      console.log(`✉️ KYC rejected email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send KYC rejected email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean> {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const template = emailTemplates.passwordReset(firstName, resetLink);
      await transporter.sendMail({
        from: `"InvestGhanaHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      console.log(`✉️ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send investment confirmation email
   */
  async sendInvestmentConfirmationEmail(
    email: string,
    firstName: string,
    amount: number,
    opportunityTitle: string,
    businessName: string
  ): Promise<boolean> {
    try {
      const template = emailTemplates.investmentConfirmation(firstName, amount, opportunityTitle, businessName);
      await transporter.sendMail({
        from: `"InvestGhanaHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      console.log(`✉️ Investment confirmation email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send investment confirmation email:', error);
      return false;
    }
  }

  /**
   * Send deposit confirmation email
   */
  async sendDepositConfirmationEmail(email: string, firstName: string, amount: number, reference: string): Promise<boolean> {
    try {
      const template = emailTemplates.depositConfirmation(firstName, amount, reference);
      await transporter.sendMail({
        from: `"InvestGhanaHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      console.log(`✉️ Deposit confirmation email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send deposit confirmation email:', error);
      return false;
    }
  }

  /**
   * Send OTP code email
   */
  async sendOTPEmail(email: string, firstName: string, code: string, purpose: string): Promise<boolean> {
    try {
      const template = emailTemplates.otpCode(firstName, code, purpose);
      await transporter.sendMail({
        from: `"InvestGhanaHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      console.log(`✉️ OTP email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

