/**
 * SMS Service for InvestGhanaHub
 * Handles SMS notifications and OTP via Hubtel (Ghana)
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hubtel SMS API configuration
const HUBTEL_BASE_URL = 'https://smsc.hubtel.com/v1/messages/send';

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format Ghana phone number
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 233
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  
  // If doesn't start with 233, add it
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  
  return cleaned;
};

/**
 * SMS Service Class
 */
class SMSService {
  private clientId: string;
  private clientSecret: string;
  private senderId: string;

  constructor() {
    this.clientId = process.env.HUBTEL_CLIENT_ID || '';
    this.clientSecret = process.env.HUBTEL_CLIENT_SECRET || '';
    this.senderId = process.env.HUBTEL_SENDER_ID || 'InvestGH';
  }

  /**
   * Send SMS via Hubtel
   */
  async sendSMS(to: string, message: string): Promise<boolean> {
    // Check if Hubtel credentials are configured
    if (!this.clientId || !this.clientSecret) {
      console.log('📱 SMS (Mock):', { to, message });
      console.log('⚠️ Hubtel not configured - SMS not sent');
      return true; // Return true in dev mode
    }

    try {
      const formattedPhone = formatPhoneNumber(to);
      
      const response = await axios.get(HUBTEL_BASE_URL, {
        params: {
          clientid: this.clientId,
          clientsecret: this.clientSecret,
          from: this.senderId,
          to: formattedPhone,
          content: message,
        },
      });

      if (response.data.status === 0) {
        console.log(`📱 SMS sent to ${formattedPhone}`);
        return true;
      } else {
        console.error('SMS send failed:', response.data);
        return false;
      }
    } catch (error: any) {
      console.error('SMS error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Send OTP code for phone verification
   */
  async sendOTP(userId: string, phone: string, type: string = 'PHONE_VERIFY'): Promise<{ success: boolean; message: string }> {
    try {
      // Generate OTP
      const code = generateOTP();
      
      // Delete any existing unused OTPs for this user and type
      await prisma.oTPCode.deleteMany({
        where: {
          userId,
          type,
          isUsed: false,
        },
      });

      // Create new OTP (expires in 10 minutes)
      await prisma.oTPCode.create({
        data: {
          userId,
          code,
          type,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Send SMS
      const message = `Your InvestGhanaHub verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
      const sent = await this.sendSMS(phone, message);

      if (sent) {
        return { success: true, message: 'OTP sent successfully' };
      } else {
        return { success: false, message: 'Failed to send OTP' };
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(userId: string, code: string, type: string = 'PHONE_VERIFY'): Promise<{ success: boolean; message: string }> {
    try {
      const otpRecord = await prisma.oTPCode.findFirst({
        where: {
          userId,
          code,
          type,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!otpRecord) {
        // Increment attempts for any matching unused OTP
        await prisma.oTPCode.updateMany({
          where: { userId, type, isUsed: false },
          data: { attempts: { increment: 1 } },
        });

        return { success: false, message: 'Invalid or expired OTP code' };
      }

      // Check if too many attempts
      if (otpRecord.attempts >= 5) {
        return { success: false, message: 'Too many attempts. Please request a new code.' };
      }

      // Mark OTP as used
      await prisma.oTPCode.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });

      // If phone verification, mark phone as verified
      if (type === 'PHONE_VERIFY') {
        await prisma.user.update({
          where: { id: userId },
          data: { phoneVerified: true },
        });
      }

      return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, message: 'Verification failed' };
    }
  }

  /**
   * Send transaction alert SMS
   */
  async sendTransactionAlert(phone: string, type: string, amount: number, balance: number): Promise<void> {
    const message = type === 'DEPOSIT'
      ? `InvestGhanaHub: Your wallet has been credited with GHS ${amount.toLocaleString()}. New balance: GHS ${balance.toLocaleString()}`
      : `InvestGhanaHub: Your withdrawal of GHS ${amount.toLocaleString()} is being processed. Current balance: GHS ${balance.toLocaleString()}`;
    
    await this.sendSMS(phone, message);
  }

  /**
   * Send investment confirmation SMS
   */
  async sendInvestmentAlert(phone: string, amount: number, businessName: string): Promise<void> {
    const message = `InvestGhanaHub: You have invested GHS ${amount.toLocaleString()} in ${businessName}. Track your investment in your portfolio.`;
    await this.sendSMS(phone, message);
  }

  /**
   * Send KYC status SMS
   */
  async sendKYCStatusAlert(phone: string, status: 'APPROVED' | 'REJECTED', reason?: string): Promise<void> {
    const message = status === 'APPROVED'
      ? `InvestGhanaHub: Great news! Your KYC verification has been approved. You can now make investments.`
      : `InvestGhanaHub: Your KYC verification was not approved. Reason: ${reason || 'Document issues'}. Please resubmit.`;
    
    await this.sendSMS(phone, message);
  }
}

// Export singleton instance
export const smsService = new SMSService();

