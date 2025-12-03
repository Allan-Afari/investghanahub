/**
 * KYC Service for InvestGhanaHub
 * Handles Know Your Customer verification for Ghana compliance
 */

import { PrismaClient, KYCStatus } from '@prisma/client';
import { encrypt, maskGhanaCard } from '../utils/encryption';

const prisma = new PrismaClient();

// Types
interface KYCSubmitData {
  ghanaCardNumber: string;
  dateOfBirth: string;
  address: string;
  city: string;
  region: string;
  occupation?: string;
  sourceOfFunds?: string;
  documentUrl?: string;
}

interface KYCResponse {
  id: string;
  ghanaCardMasked: string;
  dateOfBirth: Date;
  address: string;
  city: string;
  region: string;
  occupation: string | null;
  sourceOfFunds: string | null;
  status: KYCStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KYC Service Class
 */
class KYCService {
  /**
   * Submit KYC information
   * @param userId - User ID
   * @param data - KYC data
   * @param ipAddress - Request IP address
   * @returns Created KYC record
   */
  async submitKYC(userId: string, data: KYCSubmitData, ipAddress?: string): Promise<KYCResponse> {
    // Check if user already has KYC submitted
    const existingKYC = await prisma.kYC.findUnique({
      where: { userId }
    });

    if (existingKYC) {
      if (existingKYC.status === 'APPROVED') {
        const error = new Error('KYC already approved') as any;
        error.statusCode = 400;
        throw error;
      }
      
      if (existingKYC.status === 'PENDING') {
        const error = new Error('KYC already submitted and pending review') as any;
        error.statusCode = 400;
        throw error;
      }
    }

    // Encrypt Ghana Card number for security
    const encryptedGhanaCard = encrypt(data.ghanaCardNumber.toUpperCase());

    // Create or update KYC record
    const kyc = existingKYC
      ? await prisma.kYC.update({
          where: { userId },
          data: {
            ghanaCardNumber: encryptedGhanaCard,
            ghanaCardEncrypted: true,
            dateOfBirth: new Date(data.dateOfBirth),
            address: data.address,
            city: data.city,
            region: data.region,
            occupation: data.occupation,
            sourceOfFunds: data.sourceOfFunds,
            documentUrl: data.documentUrl,
            status: 'PENDING',
            rejectionReason: null
          }
        })
      : await prisma.kYC.create({
          data: {
            userId,
            ghanaCardNumber: encryptedGhanaCard,
            ghanaCardEncrypted: true,
            dateOfBirth: new Date(data.dateOfBirth),
            address: data.address,
            city: data.city,
            region: data.region,
            occupation: data.occupation,
            sourceOfFunds: data.sourceOfFunds,
            documentUrl: data.documentUrl
          }
        });

    // Create audit log
    await this.createAuditLog(userId, 'KYC_SUBMIT', 'KYC', kyc.id, undefined, ipAddress);

    return this.formatKYCResponse(kyc);
  }

  /**
   * Get KYC status for a user
   * @param userId - User ID
   * @returns KYC status information
   */
  async getKYCStatus(userId: string): Promise<{ status: string; details?: KYCResponse }> {
    const kyc = await prisma.kYC.findUnique({
      where: { userId }
    });

    if (!kyc) {
      return { status: 'NOT_SUBMITTED' };
    }

    return {
      status: kyc.status,
      details: this.formatKYCResponse(kyc)
    };
  }

  /**
   * Update KYC information (only if REJECTED or PENDING)
   * @param userId - User ID
   * @param data - Updated KYC data
   * @returns Updated KYC record
   */
  async updateKYC(userId: string, data: KYCSubmitData): Promise<KYCResponse> {
    const kyc = await prisma.kYC.findUnique({
      where: { userId }
    });

    if (!kyc) {
      const error = new Error('KYC not found. Please submit KYC first.') as any;
      error.statusCode = 404;
      throw error;
    }

    if (kyc.status === 'APPROVED') {
      const error = new Error('Cannot update approved KYC') as any;
      error.statusCode = 400;
      throw error;
    }

    // Encrypt Ghana Card number
    const encryptedGhanaCard = encrypt(data.ghanaCardNumber.toUpperCase());

    const updatedKYC = await prisma.kYC.update({
      where: { userId },
      data: {
        ghanaCardNumber: encryptedGhanaCard,
        dateOfBirth: new Date(data.dateOfBirth),
        address: data.address,
        city: data.city,
        region: data.region,
        occupation: data.occupation,
        sourceOfFunds: data.sourceOfFunds,
        documentUrl: data.documentUrl,
        status: 'PENDING',
        rejectionReason: null
      }
    });

    // Create audit log
    await this.createAuditLog(userId, 'KYC_UPDATE', 'KYC', updatedKYC.id);

    return this.formatKYCResponse(updatedKYC);
  }

  /**
   * Get all pending KYC submissions (admin)
   * @returns List of pending KYCs
   */
  async getPendingKYCs(): Promise<any[]> {
    const kycs = await prisma.kYC.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return kycs.map(kyc => ({
      ...this.formatKYCResponse(kyc),
      user: kyc.user
    }));
  }

  /**
   * Get KYC by ID (admin)
   * @param id - KYC ID
   * @returns KYC details
   */
  async getKYCById(id: string): Promise<any> {
    const kyc = await prisma.kYC.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            createdAt: true
          }
        }
      }
    });

    if (!kyc) {
      const error = new Error('KYC not found') as any;
      error.statusCode = 404;
      throw error;
    }

    return {
      ...this.formatKYCResponse(kyc),
      user: kyc.user
    };
  }

  /**
   * Approve KYC submission (admin)
   * @param id - KYC ID
   * @param adminId - Admin user ID
   * @returns Approved KYC record
   */
  async approveKYC(id: string, adminId: string): Promise<KYCResponse> {
    const kyc = await prisma.kYC.findUnique({
      where: { id }
    });

    if (!kyc) {
      const error = new Error('KYC not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (kyc.status !== 'PENDING') {
      const error = new Error('KYC is not pending') as any;
      error.statusCode = 400;
      throw error;
    }

    const updatedKYC = await prisma.kYC.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    // Create audit log
    await this.createAuditLog(kyc.userId, 'KYC_APPROVED', 'KYC', id, undefined, undefined, undefined, adminId);

    return this.formatKYCResponse(updatedKYC);
  }

  /**
   * Reject KYC submission (admin)
   * @param id - KYC ID
   * @param adminId - Admin user ID
   * @param reason - Rejection reason
   * @returns Rejected KYC record
   */
  async rejectKYC(id: string, adminId: string, reason: string): Promise<KYCResponse> {
    const kyc = await prisma.kYC.findUnique({
      where: { id }
    });

    if (!kyc) {
      const error = new Error('KYC not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (kyc.status !== 'PENDING') {
      const error = new Error('KYC is not pending') as any;
      error.statusCode = 400;
      throw error;
    }

    const updatedKYC = await prisma.kYC.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    // Create audit log
    await this.createAuditLog(
      kyc.userId,
      'KYC_REJECTED',
      'KYC',
      id,
      JSON.stringify({ reason }),
      undefined,
      undefined,
      adminId
    );

    return this.formatKYCResponse(updatedKYC);
  }

  /**
   * Format KYC response (mask Ghana Card)
   * @param kyc - KYC record from database
   * @returns Formatted KYC response
   */
  private formatKYCResponse(kyc: any): KYCResponse {
    return {
      id: kyc.id,
      ghanaCardMasked: maskGhanaCard(kyc.ghanaCardNumber),
      dateOfBirth: kyc.dateOfBirth,
      address: kyc.address,
      city: kyc.city,
      region: kyc.region,
      occupation: kyc.occupation,
      sourceOfFunds: kyc.sourceOfFunds,
      status: kyc.status,
      rejectionReason: kyc.rejectionReason,
      createdAt: kyc.createdAt,
      updatedAt: kyc.updatedAt
    };
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    userId: string,
    action: string,
    entity: string,
    entityId?: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
    adminId?: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        adminId,
        action,
        entity,
        entityId,
        details,
        ipAddress,
        userAgent
      }
    });
  }
}

// Export singleton instance
export const kycService = new KYCService();

