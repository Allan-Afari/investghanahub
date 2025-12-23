/**
 * Profit Distribution Service for InvestGhanaHub
 * Handles automatic profit calculations and transfers to investor wallets
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { emailService } from './emailService';

const prisma = new PrismaClient();

// Paystack configuration
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface ProfitCalculation {
  investmentId: string;
  investorId: string;
  businessId: string;
  investmentAmount: number;
  expectedReturn: number;
  profitAmount: number;
  maturityDate: Date;
  isMatured: boolean;
}

/**
 * Profit Distribution Service
 */
class ProfitDistributionService {
  /**
   * Get Paystack API key
   */
  private getPaystackKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
      console.error('❌ PAYSTACK_SECRET_KEY not found in environment variables!');
    }
    return key || '';
  }

  /**
   * Create Paystack client
   */
  private createPaystackClient() {
    return axios.create({
      baseURL: PAYSTACK_BASE_URL,
      headers: {
        Authorization: `Bearer ${this.getPaystackKey()}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Calculate profit for a matured investment
   */
  async calculateProfit(investmentId: string): Promise<ProfitCalculation | null> {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        investor: true,
        opportunity: {
          include: {
            business: {
              include: {
                bankAccount: true,
              },
            },
          },
        },
      },
    });

    if (!investment) {
      console.error(`Investment ${investmentId} not found`);
      return null;
    }

    const now = new Date();
    const isMatured = now >= investment.maturityDate;
    const profitAmount = investment.expectedReturn - investment.amount;

    return {
      investmentId: investment.id,
      investorId: investment.investorId,
      businessId: investment.opportunity.businessId,
      investmentAmount: investment.amount,
      expectedReturn: investment.expectedReturn,
      profitAmount,
      maturityDate: investment.maturityDate,
      isMatured,
    };
  }

  /**
   * Get all matured investments ready for profit distribution
   */
  async getMaturedInvestments(): Promise<ProfitCalculation[]> {
    const maturedInvestments = await prisma.investment.findMany({
      where: {
        status: 'ACTIVE',
        maturityDate: {
          lte: new Date(),
        },
      },
      include: {
        investor: true,
        opportunity: {
          include: {
            business: {
              include: {
                bankAccount: true,
              },
            },
          },
        },
      },
    });

    return maturedInvestments.map((inv) => ({
      investmentId: inv.id,
      investorId: inv.investorId,
      businessId: inv.opportunity.businessId,
      investmentAmount: inv.amount,
      expectedReturn: inv.expectedReturn,
      profitAmount: inv.expectedReturn - inv.amount,
      maturityDate: inv.maturityDate,
      isMatured: true,
    }));
  }

  /**
   * Validate business bank account
   */
  async validateBankAccount(businessId: string): Promise<boolean> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { businessId },
    });

    return !!bankAccount && bankAccount.isVerified && bankAccount.isActive;
  }

  /**
   * Transfer profit via Paystack Recipient Transfer
   */
  async transferProfitViaPaystack(
    profitTransferId: string,
    bankAccountId: string,
    amount: number,
    reference: string,
    recipientCode: string
  ): Promise<{
    success: boolean;
    paystackReference?: string;
    error?: string;
  }> {
    try {
      const paystackClient = this.createPaystackClient();

      // Create transfer
      const response = await paystackClient.post('/transfer', {
        source: 'balance', // Transfer from Paystack balance
        amount: Math.round(amount * 100), // Amount in pesewas
        recipient: recipientCode,
        reason: `Investment profit distribution - Ref: ${reference}`,
        reference,
      });

      if (response.data.status) {
        // Update profit transfer with Paystack reference
        await prisma.profitTransfer.update({
          where: { id: profitTransferId },
          data: {
            paystackReference: response.data.data.reference,
            status: 'PROCESSING',
          },
        });

        return {
          success: true,
          paystackReference: response.data.data.reference,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Transfer initiation failed',
      };
    } catch (error: any) {
      console.error('Paystack transfer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Transfer failed',
      };
    }
  }

  /**
   * Create or get Paystack recipient for bank account
   */
  async getOrCreatePaystackRecipient(bankAccount: any): Promise<string | null> {
    try {
      const paystackClient = this.createPaystackClient();

      // Check if recipient already exists in metadata or create new
      const recipientData = {
        type: 'nuban',
        name: bankAccount.accountHolderName,
        account_number: bankAccount.accountNumber,
        bank_code: bankAccount.bankCode,
        currency: 'GHS',
      };

      const response = await paystackClient.post('/transferrecipient', recipientData);

      if (response.data.status) {
        return response.data.data.recipient_code;
      }

      console.error('Failed to create Paystack recipient:', response.data.message);
      return null;
    } catch (error: any) {
      // Recipient might already exist
      console.error('Error creating Paystack recipient:', error.message);
      return null;
    }
  }

  /**
   * Distribute profit to investor wallet directly
   */
  async distributeProfit(profitTransfer: any): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { investorId, amount, reference, id } = profitTransfer;

      // Get or create wallet
      let wallet = await prisma.wallet.findUnique({
        where: { userId: investorId },
      });

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId: investorId },
        });
      }

      // Credit wallet with profit
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
      });

      // Create wallet transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'RETURN',
          amount,
          reference: `WT-PROFIT-${reference}`,
          status: 'COMPLETED',
          description: `Investment profit distribution`,
        },
      });

      // Update profit transfer status
      await prisma.profitTransfer.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          transferredAt: new Date(),
        },
      });

      // Update investment status to MATURED
      await prisma.investment.update({
        where: { id: profitTransfer.investmentId },
        data: { status: 'MATURED' },
      });

      return {
        success: true,
        message: 'Profit distributed to wallet',
      };
    } catch (error: any) {
      console.error('Profit distribution error:', error.message);

      // Mark as failed
      await prisma.profitTransfer.update({
        where: { id: profitTransfer.id },
        data: {
          status: 'FAILED',
          failureReason: error.message,
        },
      });

      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Process automatic profit distribution (runs as cron job)
   */
  async processAutomaticDistribution(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    message: string;
  }> {
    console.log('🔄 Starting automatic profit distribution process...');

    try {
      const maturedInvestments = await this.getMaturedInvestments();
      let processed = 0;
      let failed = 0;

      for (const investment of maturedInvestments) {
        try {
          // Get business and bank account
          const business = await prisma.business.findUnique({
            where: { id: investment.businessId },
            include: { bankAccount: true },
          });

          if (!business || !business.bankAccount) {
            console.warn(
              `⚠️ No bank account found for business ${business?.name || investment.businessId}`
            );
            failed++;
            continue;
          }

          // Get investor
          const investor = await prisma.user.findUnique({
            where: { id: investment.investorId },
          });

          if (!investor) {
            console.warn(`⚠️ Investor ${investment.investorId} not found`);
            failed++;
            continue;
          }

          // Check if profit transfer already exists
          const existingTransfer = await prisma.profitTransfer.findFirst({
            where: {
              investmentId: investment.investmentId,
              status: { in: ['PROCESSING', 'COMPLETED'] },
            },
          });

          if (existingTransfer) {
            console.log(
              `⏭️ Profit transfer already exists for investment ${investment.investmentId}`
            );
            continue;
          }

          // Create profit transfer record
          const reference = `PROFIT-${uuidv4().substring(0, 12).toUpperCase()}`;

          const profitTransfer = await prisma.profitTransfer.create({
            data: {
              investmentId: investment.investmentId,
              bankAccountId: business.bankAccount.id,
              investorId: investment.investorId,
              amount: investment.expectedReturn,
              profitAmount: investment.profitAmount,
              investedAmount: investment.investmentAmount,
              reference,
              status: 'PENDING',
            },
          });

          // Distribute profit to investor wallet
          const result = await this.distributeProfit(profitTransfer);

          if (result.success) {
            processed++;
            console.log(`✅ Profit distributed for investment ${investment.investmentId}`);

            // Send notification email to investor
            try {
              await emailService.sendProfitDistributionEmail(
                investor.email,
                investor.firstName,
                investment.profitAmount,
                investment.expectedReturn
              );
            } catch (emailError) {
              console.error('Failed to send profit email:', emailError);
            }

            // Create audit log
            await prisma.auditLog.create({
              data: {
                userId: investment.investorId,
                action: 'PROFIT_DISTRIBUTED',
                entity: 'Investment',
                entityId: investment.investmentId,
                details: JSON.stringify({
                  profit: investment.profitAmount,
                  total: investment.expectedReturn,
                  reference,
                }),
              },
            });
          } else {
            failed++;
            console.error(
              `❌ Failed to distribute profit for investment ${investment.investmentId}: ${result.message}`
            );
          }
        } catch (error: any) {
          failed++;
          console.error(
            `❌ Error processing investment ${investment.investmentId}:`,
            error.message
          );
        }
      }

      const message = `Processed ${processed} successful, ${failed} failed out of ${maturedInvestments.length} matured investments`;
      console.log(`✅ ${message}`);

      return {
        success: true,
        processed,
        failed,
        message,
      };
    } catch (error: any) {
      console.error('❌ Automatic distribution process error:', error.message);
      return {
        success: false,
        processed: 0,
        failed: 0,
        message: error.message,
      };
    }
  }

  /**
   * Get profit transfer history for investor
   */
  async getProfitHistory(
    investorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      prisma.profitTransfer.findMany({
        where: { investorId },
        include: {
          investment: {
            include: {
              opportunity: {
                include: {
                  business: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          bankAccount: {
            select: {
              bankName: true,
              accountNumber: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.profitTransfer.count({ where: { investorId } }),
    ]);

    return {
      transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get profit distribution statistics
   */
  async getProfitStats(investorId: string): Promise<any> {
    const transfers = await prisma.profitTransfer.findMany({
      where: { investorId },
    });

    const totalProfitDistributed = transfers
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.profitAmount, 0);

    const pendingProfit = transfers
      .filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING')
      .reduce((sum, t) => sum + t.profitAmount, 0);

    const completedCount = transfers.filter((t) => t.status === 'COMPLETED').length;
    const pendingCount = transfers.filter(
      (t) => t.status === 'PENDING' || t.status === 'PROCESSING'
    ).length;
    const failedCount = transfers.filter((t) => t.status === 'FAILED').length;

    return {
      totalProfitDistributed,
      pendingProfit,
      completedCount,
      pendingCount,
      failedCount,
      totalTransfers: transfers.length,
    };
  }
}

// Export singleton instance
export const profitDistributionService = new ProfitDistributionService();
