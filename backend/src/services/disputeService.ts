import { prisma } from '../config/database';
import { AppError } from '../utils/error.util';

class DisputeService {
  async upsertFromPaystackChargeDispute(payload: any): Promise<void> {
    const data = payload?.data;

    const paymentReference: string | undefined =
      data?.transaction?.reference || data?.transaction_reference || data?.reference;

    if (!paymentReference) {
      return;
    }

    const paystackDisputeId: string | undefined = data?.id || data?.dispute?.id;

    const payment = await prisma.payment.findUnique({
      where: { reference: paymentReference },
    });

    const escrow = await prisma.escrow.findUnique({
      where: { paymentReference },
    });

    const openedBy = payment?.userId || escrow?.investorId;

    if (!openedBy) {
      return;
    }

    await prisma.dispute.upsert({
      where: { paymentReference },
      create: {
        paymentReference,
        paystackDisputeId,
        paymentId: payment?.id,
        escrowId: escrow?.id,
        investmentId: escrow?.investmentId,
        openedBy,
        amount: typeof data?.amount === 'number' ? data.amount / 100 : undefined,
        reason: data?.reason || data?.message,
        status: 'UNDER_REVIEW',
        metadata: JSON.stringify(data ?? {}),
      },
      update: {
        paystackDisputeId: paystackDisputeId || undefined,
        paymentId: payment?.id,
        escrowId: escrow?.id,
        investmentId: escrow?.investmentId,
        amount: typeof data?.amount === 'number' ? data.amount / 100 : undefined,
        reason: data?.reason || data?.message,
        status: 'UNDER_REVIEW',
        metadata: JSON.stringify(data ?? {}),
      },
    });
  }

  async createDispute(
    openedBy: string,
    params: { paymentReference?: string; escrowId?: string; reason?: string }
  ): Promise<any> {
    const { paymentReference: providedReference, escrowId, reason } = params;

    let paymentReference = providedReference;
    let paymentId: string | undefined;
    let escrow: any | null = null;

    if (escrowId) {
      escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
      if (!escrow || escrow.investorId !== openedBy) {
        throw AppError.notFound('Escrow not found');
      }
      paymentReference = escrow.paymentReference;
    }

    if (!paymentReference) {
      throw AppError.badRequest('paymentReference or escrowId is required');
    }

    const payment = await prisma.payment.findUnique({ where: { reference: paymentReference } });
    if (payment) {
      paymentId = payment.id;
      if (payment.userId !== openedBy) {
        throw AppError.forbidden('Not authorized to dispute this payment');
      }
    } else if (!escrow) {
      throw AppError.notFound('Payment not found');
    }

    const dispute = await prisma.dispute.create({
      data: {
        paymentReference,
        paymentId,
        escrowId: escrow?.id,
        investmentId: escrow?.investmentId,
        openedBy,
        amount: escrow?.amount || payment?.amount,
        reason,
        status: 'OPEN',
      },
    });

    return dispute;
  }

  async listMyDisputes(userId: string): Promise<any[]> {
    return prisma.dispute.findMany({
      where: { openedBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllDisputes(filters: { status?: string } = {}): Promise<any[]> {
    const where: any = {};
    if (filters.status) where.status = filters.status;

    return prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        opener: { select: { id: true, email: true } },
        resolver: { select: { id: true, email: true } },
      },
    });
  }

  async getDisputeById(userId: string, id: string, isAdmin: boolean): Promise<any> {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        opener: { select: { id: true, email: true } },
        resolver: { select: { id: true, email: true } },
      },
    });

    if (!dispute) {
      throw AppError.notFound('Dispute not found');
    }

    if (!isAdmin && dispute.openedBy !== userId) {
      throw AppError.forbidden('Not authorized');
    }

    return dispute;
  }

  async resolveDispute(
    adminId: string,
    disputeId: string,
    resolution: 'REFUND' | 'RELEASE' | 'REJECTED',
    resolutionNotes?: string
  ): Promise<any> {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });

    if (!dispute) {
      throw AppError.notFound('Dispute not found');
    }

    if (dispute.status === 'RESOLVED') {
      return dispute;
    }

    return prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolvedBy: adminId,
        resolvedAt: new Date(),
        resolution,
        resolutionNotes,
      },
    });
  }
}

export const disputeService = new DisputeService();
