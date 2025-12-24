import { PrismaClient } from '@prisma/client';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

export interface CreateVerificationRequestParams {
  businessId: string;
  documents: {
    businessRegistration?: string;
    taxCertificate?: string;
    bankStatement?: string;
    directorId?: string;
    proofOfAddress?: string;
    financialStatements?: string;
  };
  additionalInfo?: {
    businessType?: string;
    registrationNumber?: string;
    taxIdNumber?: string;
    physicalAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    numberOfEmployees?: number;
    yearsOfOperation?: number;
  };
}

export interface UpdateVerificationStatusParams {
  verificationId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_ADDITIONAL_INFO';
  reviewedBy?: string; // Admin ID
  reviewNotes?: string;
  additionalDocumentsRequested?: string[];
}

export class BusinessVerificationService {
  /**
   * Create business verification request
   */
  async createVerificationRequest(params: CreateVerificationRequestParams, userId: string) {
    try {
      // Verify user owns the business
      const business = await prisma.business.findUnique({
        where: { id: params.businessId },
      });

      if (!business || business.ownerId !== userId) {
        throw new Error('Business not found or unauthorized');
      }

      // Check if verification already exists
      const existingVerification = await prisma.businessVerification.findFirst({
        where: { businessId: params.businessId },
      });

      if (existingVerification && existingVerification.status !== 'REJECTED') {
        throw new Error('Verification request already exists');
      }

      // Create verification request
      const verification = await prisma.businessVerification.create({
        data: {
          businessId: params.businessId,
          status: 'PENDING',
          documents: params.documents,
          additionalInfo: params.additionalInfo || {},
          submittedAt: new Date(),
          submittedBy: userId,
        },
      });

      // Update business verification status
      await prisma.business.update({
        where: { id: params.businessId },
        data: {
          status: 'PENDING',
          reviewedAt: new Date(),
        },
      });

      // Notify business owner
      await notificationService.create({
        userId,
        title: 'Business Verification Submitted',
        message: 'Your business verification request has been submitted. We will review it within 3-5 business days.',
        type: 'INFO',
        category: 'BUSINESS',
        sendEmail: true,
      });

      // Notify admins
      await this.notifyAdmins('New Business Verification', {
        businessName: business.name,
        businessId: params.businessId,
        verificationId: verification.id,
      });

      return {
        success: true,
        data: verification,
      };
    } catch (error) {
      console.error('Create verification request error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create verification request',
      };
    }
  }

  /**
   * Update verification status (Admin only)
   */
  async updateVerificationStatus(params: UpdateVerificationStatusParams, adminId: string) {
    try {
      const verification = await prisma.businessVerification.findUnique({
        where: { id: params.verificationId },
        include: {
          business: true,
        },
      });

      if (!verification) {
        throw new Error('Verification not found');
      }

      // Update verification status
      const updatedVerification = await prisma.businessVerification.update({
        where: { id: params.verificationId },
        data: {
          status: params.status,
          reviewedBy: params.reviewedBy || adminId,
          reviewNotes: params.reviewNotes,
          additionalDocumentsRequested: params.additionalDocumentsRequested || [],
          reviewedAt: new Date(),
        },
      });

      // Update business verification status
      let businessStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
      switch (params.status) {
        case 'APPROVED':
          businessStatus = 'APPROVED';
          break;
        case 'REJECTED':
          businessStatus = 'REJECTED';
          break;
        case 'REQUIRES_ADDITIONAL_INFO':
          businessStatus = 'PENDING';
          break;
        default:
          businessStatus = 'PENDING';
      }

      // Update verification status - no need to update Business model
      // as verification is handled through BusinessVerification model

      // Notify business owner
      await this.notifyBusinessOwner(verification.businessId, params.status, params.reviewNotes, params.additionalDocumentsRequested);

      return {
        success: true,
        data: updatedVerification,
      };
    } catch (error) {
      console.error('Update verification status error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update verification status',
      };
    }
  }

  /**
   * Get verification details
   */
  async getVerificationDetails(verificationId: string, userId?: string) {
    try {
      const whereClause: any = { id: verificationId };
      
      if (userId) {
        // Include only if user owns the business or is admin
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user?.role !== 'ADMIN') {
          whereClause.business = {
            ownerId: userId,
          };
        }
      }

      const verification = await prisma.businessVerification.findFirst({
        where: whereClause,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        data: verification,
      };
    } catch (error) {
      console.error('Get verification details error:', error);
      return {
        success: false,
        message: 'Failed to get verification details',
      };
    }
  }

  /**
   * Get all verification requests (Admin only)
   */
  async getAllVerifications(page = 1, limit = 20, status?: string) {
    try {
      const whereClause: any = {};
      if (status) {
        whereClause.status = status;
      }

      const [verifications, total] = await Promise.all([
        prisma.businessVerification.findMany({
          where: whereClause,
          include: {
            business: {
              select: { name: true },
            },
            reviewer: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.businessVerification.count({ where: whereClause }),
      ]);

      return {
        success: true,
        data: verifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get all verifications error:', error);
      return {
        success: false,
        message: 'Failed to get verification requests',
      };
    }
  }

  /**
   * Get verification checklist for business owners
   */
  async getVerificationChecklist() {
    return {
      success: true,
      data: {
        requiredDocuments: [
          {
            name: 'Business Registration Certificate',
            description: 'Official business registration document from Registrar General\'s Department',
            required: true,
            format: 'PDF, JPG, PNG',
          },
          {
            name: 'Tax Clearance Certificate',
            description: 'Recent tax clearance certificate from Ghana Revenue Authority',
            required: true,
            format: 'PDF, JPG, PNG',
          },
          {
            name: 'Bank Statement',
            description: 'Last 6 months business bank statements',
            required: true,
            format: 'PDF',
          },
          {
            name: 'Director\'s ID',
            description: 'Valid ID document of business director/owner',
            required: true,
            format: 'PDF, JPG, PNG',
          },
          {
            name: 'Proof of Address',
            description: 'Utility bill or tenancy agreement for business address',
            required: false,
            format: 'PDF, JPG, PNG',
          },
          {
            name: 'Financial Statements',
            description: 'Audited financial statements for the last 2 years',
            required: false,
            format: 'PDF',
          },
        ],
        verificationProcess: [
          'Submit all required documents',
          'Admin review within 3-5 business days',
          'Additional information may be requested',
          'Verification status: Pending, In Review, Approved, Rejected',
          'Approved businesses get verification badge',
        ],
        benefits: [
          'Increased investor trust',
          'Higher visibility on platform',
          'Access to premium features',
          'Priority support',
        ],
      },
    };
  }

  /**
   * Notify admins about new verification request
   */
  private async notifyAdmins(title: string, data: any) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    for (const admin of admins) {
      await notificationService.create({
        userId: admin.id,
        title,
        message: `New verification request for ${data.businessName}. Business ID: ${data.businessId}`,
        type: 'INFO',
        category: 'BUSINESS',
        sendEmail: true,
      });
    }
  }

  /**
   * Notify business owner about verification status change
   */
  private async notifyBusinessOwner(
    businessId: string,
    status: string,
    reviewNotes?: string,
    additionalDocuments?: string[]
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) return;

    const messages = {
      IN_REVIEW: {
        title: 'Business Verification In Review',
        message: 'Your business verification is now being reviewed by our team.',
        type: 'INFO' as const,
      },
      APPROVED: {
        title: 'Business Verification Approved! 🎉',
        message: 'Congratulations! Your business has been verified. You now have access to all platform features.',
        type: 'SUCCESS' as const,
      },
      REJECTED: {
        title: 'Business Verification Needs Attention',
        message: `Your verification was not approved. Reason: ${reviewNotes || 'Please review your documents'}`,
        type: 'WARNING' as const,
      },
      REQUIRES_ADDITIONAL_INFO: {
        title: 'Additional Information Required',
        message: `Please provide additional documents: ${additionalDocuments?.join(', ') || 'See review notes'}`,
        type: 'WARNING' as const,
      },
    };

    const notification = messages[status as keyof typeof messages];
    if (notification) {
      await notificationService.create({
        userId: business.ownerId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: 'BUSINESS',
        sendEmail: true,
      });
    }
  }
}

// Export singleton instance
export const businessVerificationService = new BusinessVerificationService();
