/**
 * Payment Service for InvestGhanaHub
 * Handles Paystack integration for Mobile Money and Card payments
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from './emailService';

const prisma = new PrismaClient();

// Paystack configuration
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Get Paystack secret key (read fresh each time to ensure env is loaded)
const getPaystackKey = () => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    console.error('❌ PAYSTACK_SECRET_KEY not found in environment variables!');
  }
  return key || '';
};

// Create Paystack API client function
const createPaystackClient = () => {
  return axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
      Authorization: `Bearer ${getPaystackKey()}`,
      'Content-Type': 'application/json',
    },
  });
};

// Mobile Money provider codes
const MOBILE_MONEY_PROVIDERS: Record<string, string> = {
  'MTN': 'mtn',
  'VODAFONE': 'vod',
  'AIRTELTIGO': 'tgo',
};

interface InitiatePaymentData {
  userId: string;
  amount: number;
  email: string;
  paymentMethod: 'MOMO_MTN' | 'MOMO_VODAFONE' | 'MOMO_AIRTELTIGO' | 'CARD';
  phoneNumber?: string;
  callbackUrl?: string;
}

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    metadata: any;
  };
}

/**
 * Payment Service Class
 */
class PaymentService {
  /**
   * Initialize a payment (for deposit)
   */
  async initiateDeposit(data: InitiatePaymentData): Promise<any> {
    const reference = `DEP-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        reference,
        paymentMethod: data.paymentMethod,
        phoneNumber: data.phoneNumber,
        type: 'DEPOSIT',
        status: 'PENDING',
      },
    });

    // Prepare Paystack payload
    const paystackPayload: any = {
      email: data.email,
      amount: Math.round(data.amount * 100), // Paystack uses pesewas
      currency: 'GHS',
      reference,
      callback_url: data.callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        userId: data.userId,
        paymentId: payment.id,
        type: 'DEPOSIT',
      },
    };

    // Add mobile money channel if applicable
    if (data.paymentMethod.startsWith('MOMO_')) {
      const provider = data.paymentMethod.replace('MOMO_', '');
      paystackPayload.channels = ['mobile_money'];
      paystackPayload.mobile_money = {
        phone: data.phoneNumber,
        provider: MOBILE_MONEY_PROVIDERS[provider],
      };
    }

    try {
      const response = await createPaystackClient().post<PaystackInitResponse>('/transaction/initialize', paystackPayload);
      
      // Update payment with Paystack reference
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paystackReference: response.data.data.reference,
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
      };
    } catch (error: any) {
      console.error('Paystack init error:', error.response?.data || error.message);
      
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      throw new Error(error.response?.data?.message || 'Payment initialization failed');
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(reference: string): Promise<any> {
    try {
      const response = await createPaystackClient().get<PaystackVerifyResponse>(`/transaction/verify/${reference}`);
      const paymentData = response.data.data;

      // Get payment record
      const payment = await prisma.payment.findUnique({
        where: { reference },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (paymentData.status === 'success') {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(paymentData.paid_at),
          },
        });

        // Credit user's wallet
        if (payment.type === 'DEPOSIT') {
          await this.creditWallet(payment.userId, payment.amount, reference);
        }

        // Get user for email
        const user = await prisma.user.findUnique({
          where: { id: payment.userId },
        });

        if (user) {
          // Send confirmation email
          await emailService.sendDepositConfirmationEmail(
            user.email,
            user.firstName,
            payment.amount,
            reference
          );
        }

        return {
          success: true,
          status: 'SUCCESS',
          amount: payment.amount,
          reference,
        };
      } else {
        // Update payment status to failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        return {
          success: false,
          status: paymentData.status,
          message: 'Payment was not successful',
        };
      }
    } catch (error: any) {
      console.error('Payment verification error:', error.response?.data || error.message);
      throw new Error('Failed to verify payment');
    }
  }

  /**
   * Credit user's wallet
   */
  async creditWallet(userId: string, amount: number, reference: string): Promise<void> {
    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId },
      });
    }

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount },
      },
    });

    // Create wallet transaction record
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amount,
        reference: `WT-${reference}`,
        status: 'COMPLETED',
        description: 'Wallet deposit via Paystack',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WALLET_DEPOSIT',
        entity: 'Wallet',
        entityId: wallet.id,
        details: JSON.stringify({ amount, reference }),
      },
    });
  }

  /**
   * Debit user's wallet (for investments)
   */
  async debitWallet(userId: string, amount: number, description: string): Promise<{ success: boolean; message?: string }> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return { success: false, message: 'Wallet not found. Please make a deposit first.' };
    }

    if (wallet.balance < amount) {
      return { success: false, message: `Insufficient balance. Available: ₵${wallet.balance.toLocaleString()}` };
    }

    const reference = `WT-INV-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Debit wallet
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: amount },
      },
    });

    // Create wallet transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'INVESTMENT',
        amount: -amount,
        reference,
        status: 'COMPLETED',
        description,
      },
    });

    return { success: true };
  }

  /**
   * Get user's wallet
   */
  async getWallet(userId: string): Promise<any> {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        walletTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId },
        include: {
          walletTransactions: true,
        },
      });
    }

    return wallet;
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return { transactions: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Initiate withdrawal (to mobile money)
   */
  async initiateWithdrawal(userId: string, amount: number, phoneNumber: string, provider: string): Promise<any> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const fee = amount * 0.01; // 1% withdrawal fee
    const netAmount = amount - fee;
    const reference = `WTH-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create payment record for withdrawal
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: netAmount,
        fee,
        reference,
        paymentMethod: `MOMO_${provider}`,
        phoneNumber,
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
    });

    // Debit wallet immediately
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: amount },
      },
    });

    // Create wallet transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'WITHDRAWAL',
        amount: -amount,
        fee,
        reference: `WT-${reference}`,
        status: 'PENDING',
        description: `Withdrawal to ${provider} - ${phoneNumber}`,
      },
    });

    // In production, you would initiate a Paystack transfer here
    // For now, we'll simulate it
    console.log(`💸 Withdrawal initiated: ₵${netAmount} to ${phoneNumber} (${provider})`);

    return {
      success: true,
      reference,
      amount: netAmount,
      fee,
      message: 'Withdrawal initiated. You will receive funds within 24 hours.',
    };
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string, type?: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (type) where.type = type;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

