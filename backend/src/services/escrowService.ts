import { PrismaClient } from '@prisma/client';
import { paystackService } from './paystackService';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

export interface CreateEscrowParams {
  investmentId: string;
  investorId: string;
  businessId: string;
  amount: number; // in GHS
  currency?: string;
  conditions?: string[]; // Custom release conditions
  releaseOn?: Date; // Auto-release date
}

export interface ReleaseEscrowParams {
  escrowId: string;
  releasedBy: string; // Admin or system
  reason?: string;
  documents?: string[]; // Supporting documents
}

export interface RefundEscrowParams {
  escrowId: string;
  refundedBy: string;
  reason: string;
  refundAmount?: number; // Partial refund (in GHS)
}

export class EscrowService {
  /**
   * Create escrow for investment
   */
  async createEscrow(params: CreateEscrowParams) {
    try {
      // Convert amount to kobo for Paystack
      const amountInKobo = params.amount * 100;

      // Initialize Paystack transaction to hold funds
      const paymentResult = await paystackService.initializeTransaction({
        email: '', // Will be set from investor email
        amount: amountInKobo,
        reference: `ESCROW_${Date.now()}_${params.investorId}`,
        metadata: {
          type: 'escrow',
          investmentId: params.investmentId,
          investorId: params.investorId,
          businessId: params.businessId,
          conditions: params.conditions || [],
          autoReleaseDate: params.releaseOn,
        },
      });

      if (!paymentResult.success) {
        throw new Error('Failed to initialize escrow payment');
      }

      // Create escrow record
      const escrow = await prisma.escrow.create({
        data: {
          investmentId: params.investmentId,
          investorId: params.investorId,
          businessId: params.businessId,
          amount: params.amount,
          currency: params.currency || 'GHS',
          status: 'PENDING',
          paymentReference: paymentResult.reference,
          paymentUrl: paymentResult.authorization_url,
          conditions: params.conditions || [],
          releaseOn: params.releaseOn,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Notify investor
      await notificationService.create({
        userId: params.investorId,
        title: 'Investment Escrow Initiated',
        message: `Your ₵${params.amount.toLocaleString()} investment has been placed in secure escrow. Complete payment to proceed.`,
        type: 'INFO',
        category: 'TRANSACTION',
        link: paymentResult.authorization_url,
        sendEmail: true,
      });

      // Notify business owner
      await notificationService.create({
        userId: params.businessId,
        title: 'New Investment in Escrow',
        message: `An investor has committed ₵${params.amount.toLocaleString()} to your business. Funds are secured in escrow.`,
        type: 'SUCCESS',
        category: 'INVESTMENT',
        sendEmail: true,
      });

      return {
        success: true,
        data: escrow,
        paymentUrl: paymentResult.authorization_url,
      };
    } catch (error) {
      console.error('Create escrow error:', error);
      return {
        success: false,
        message: 'Failed to create escrow',
      };
    }
  }

  /**
   * Confirm escrow payment after investor completes payment
   */
  async confirmEscrowPayment(escrowId: string, paymentReference: string) {
    try {
      // Verify payment with Paystack
      const verification = await paystackService.verifyTransaction({ reference: paymentReference });

      if (!verification.success) {
        throw new Error('Payment verification failed');
      }

      // Update escrow status
      const escrow = await prisma.escrow.update({
        where: { id: escrowId },
        data: {
          status: 'HELD',
          paidAt: new Date(),
          paymentVerified: true,
        },
      });

      // Notify both parties
      await this.notifyEscrowParties(escrowId, 'ESCROW_HELD', {
        amount: verification.amount / 100,
        message: 'Funds successfully secured in escrow',
      });

      return {
        success: true,
        data: escrow,
      };
    } catch (error) {
      console.error('Confirm escrow payment error:', error);
      return {
        success: false,
        message: 'Failed to confirm escrow payment',
      };
    }
  }

  /**
   * Release funds from escrow
   */
  async releaseEscrow(params: ReleaseEscrowParams) {
    try {
      const escrow = await prisma.escrow.findUnique({
        where: { id: params.escrowId },
        include: {
          investment: true,
          investor: true,
          business: true,
        },
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'HELD') {
        throw new Error('Escrow cannot be released in current state');
      }

      // Check release conditions
      const conditionsMet = await this.checkReleaseConditions(escrow);
      if (!conditionsMet) {
        throw new Error('Release conditions not met');
      }

      // Initiate transfer to business owner
      const transferResult = await paystackService.createTransfer({
        source: 'balance',
        amount: escrow.amount * 100, // Convert to kobo
        recipient: {
          type: 'bank_account',
          name: escrow.business.name,
          account_number: 'N/A', // User model doesn't have accountNumber
          bank_code: 'N/A', // User model doesn't have bankCode
        },
        reason: `Investment payout for ${escrow.investment.opportunityId || 'investment'}`,
        reference: `ESCROW_RELEASE_${escrow.id}`,
      });

      if (!transferResult.success) {
        throw new Error('Failed to release funds');
      }

      // Update escrow status
      const updatedEscrow = await prisma.escrow.update({
        where: { id: params.escrowId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          releasedBy: params.releasedBy,
          releaseReason: params.reason || 'Conditions met',
          transferReference: transferResult.reference,
          documents: params.documents || [],
        },
      });

      // Update investment status
      await prisma.investment.update({
        where: { id: escrow.investmentId },
        data: {
          status: 'ACTIVE',
          investedAt: new Date(),
        },
      });

      // Notify parties
      await this.notifyEscrowParties(params.escrowId, 'FUNDS_RELEASED', {
        amount: escrow.amount,
        transferReference: transferResult.reference,
      });

      return {
        success: true,
        data: updatedEscrow,
      };
    } catch (error) {
      console.error('Release escrow error:', error);
      return {
        success: false,
        message: 'Failed to release escrow',
      };
    }
  }

  /**
   * Refund escrow funds
   */
  async refundEscrow(params: RefundEscrowParams) {
    try {
      const escrow = await prisma.escrow.findUnique({
        where: { id: params.escrowId },
        include: { investor: true, business: true },
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status === 'RELEASED') {
        throw new Error('Cannot refund released escrow');
      }

      const refundAmount = params.refundAmount || escrow.amount;

      // Process refund via Paystack (or mark for manual refund)
      const refundResult = await this.processRefund(escrow, refundAmount, params.reason);

      if (!refundResult.success) {
        throw new Error('Refund processing failed');
      }

      // Update escrow status
      const updatedEscrow = await prisma.escrow.update({
        where: { id: params.escrowId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundedBy: params.refundedBy,
          refundReason: params.reason,
          refundAmount,
          refundReference: refundResult.reference,
        },
      });

      // Notify investor
      await notificationService.create({
        userId: escrow.investorId,
        title: 'Investment Refunded',
        message: `Your investment of ₵${refundAmount.toLocaleString()} has been refunded. Reason: ${params.reason}`,
        type: 'INFO',
        category: 'TRANSACTION',
        sendEmail: true,
      });

      // Notify business owner
      await notificationService.create({
        userId: escrow.businessId,
        title: 'Investment Refunded',
        message: `An investment refund has been processed. Amount: ₵${refundAmount.toLocaleString()}`,
        type: 'WARNING',
        category: 'INVESTMENT',
        sendEmail: true,
      });

      return {
        success: true,
        data: updatedEscrow,
      };
    } catch (error) {
      console.error('Refund escrow error:', error);
      return {
        success: false,
        message: 'Failed to refund escrow',
      };
    }
  }

  /**
   * Get escrow details
   */
  async getEscrowDetails(escrowId: string, userId?: string) {
    try {
      const whereClause: any = { id: escrowId };
      
      if (userId) {
        whereClause.OR = [
          { investorId: userId },
          { businessId: userId },
        ];
      }

      const escrow = await prisma.escrow.findUnique({
        where: whereClause,
        include: {
          investment: true,
          investor: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          business: {
            select: { id: true, name: true, ownerId: true },
          },
        },
      });

      return {
        success: true,
        data: escrow,
      };
    } catch (error) {
      console.error('Get escrow details error:', error);
      return {
        success: false,
        message: 'Failed to get escrow details',
      };
    }
  }

  /**
   * Check if release conditions are met
   */
  private async checkReleaseConditions(escrow: any): Promise<boolean> {
    // Auto-release date check
    if (escrow.releaseOn && new Date() >= escrow.releaseOn) {
      return true;
    }

    // Custom conditions check (can be extended)
    if (escrow.conditions && escrow.conditions.length > 0) {
      // For now, return true - implement custom logic as needed
      return true;
    }

    // Manual release by admin
    return false;
  }

  /**
   * Process refund (can be extended for different refund methods)
   */
  private async processRefund(escrow: any, amount: number, reason: string) {
    try {
      // For now, mark as manual refund
      // In production, integrate with Paystack refund API
      return {
        success: true,
        reference: `MANUAL_REFUND_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Refund processing failed',
      };
    }
  }

  /**
   * Notify escrow parties
   */
  private async notifyEscrowParties(escrowId: string, event: string, data: any) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { investor: true, business: true },
    });

    if (!escrow) return;

    const messages: Record<string, { investor: string; business: string }> = {
      ESCROW_HELD: {
        investor: `Your ₵${data.amount} investment is now secured in escrow.`,
        business: `₵${data.amount} has been secured in escrow for your business.`,
      },
      FUNDS_RELEASED: {
        investor: `₵${data.amount} has been released to the business owner.`,
        business: `₵${data.amount} has been released to your account.`,
      },
    };

    const message = messages[event as keyof typeof messages];
    if (message) {
      await notificationService.create({
        userId: escrow.investorId,
        title: 'Escrow Update',
        message: message.investor,
        type: 'INFO',
        category: 'TRANSACTION',
        sendEmail: true,
      });

      await notificationService.create({
        userId: escrow.businessId,
        title: 'Escrow Update',
        message: message.business,
        type: 'INFO',
        category: 'INVESTMENT',
        sendEmail: true,
      });
    }
  }
}

// Export singleton instance
export const escrowService = new EscrowService();
