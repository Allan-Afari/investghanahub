/**
 * Business Service for InvestGhanaHub
 * Handles business registration and management for crops, startups, and operational businesses
 */

import { PrismaClient, BusinessStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Types
interface BusinessCreateData {
  name: string;
  description: string;
  category: string;
  location: string;
  region: string;
  registrationNumber?: string;
  targetAmount: number;
}

interface OpportunityCreateData {
  title: string;
  description: string;
  minInvestment: number;
  maxInvestment: number;
  expectedReturn: number;
  duration: number;
  riskLevel: string;
  targetAmount: number;
  startDate: string;
  endDate: string;
}

interface ListFilters {
  category?: string;
  region?: string;
  page: number;
  limit: number;
}

/**
 * Business Service Class
 */
class BusinessService {
  /**
   * Create a new business
   * @param ownerId - Business owner's user ID
   * @param data - Business data
   * @returns Created business
   */
  async createBusiness(ownerId: string, data: BusinessCreateData): Promise<any> {
    // Check if owner has approved KYC
    const kyc = await prisma.kYC.findUnique({
      where: { userId: ownerId }
    });

    if (!kyc || kyc.status !== 'APPROVED') {
      const error = new Error('KYC must be approved before creating a business') as any;
      error.statusCode = 403;
      throw error;
    }

    // Create business
    const business = await prisma.business.create({
      data: {
        ownerId,
        name: data.name,
        description: data.description,
        category: data.category,
        location: data.location,
        region: data.region,
        registrationNumber: data.registrationNumber,
        targetAmount: data.targetAmount
      }
    });

    // Create audit log
    await this.createAuditLog(ownerId, 'BUSINESS_CREATE', 'Business', business.id);

    return business;
  }

  /**
   * List all approved businesses with filters
   * @param filters - Filter options
   * @returns Paginated list of businesses
   */
  async listApprovedBusinesses(filters: ListFilters): Promise<any> {
    const { category, region, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = { status: 'APPROVED' };
    if (category) where.category = category;
    if (region) where.region = region;

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          opportunities: {
            where: { status: 'OPEN' },
            select: {
              id: true,
              title: true,
              minInvestment: true,
              expectedReturn: true,
              riskLevel: true
            }
          },
          _count: {
            select: { opportunities: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.business.count({ where })
    ]);

    return {
      businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get business by ID
   * @param id - Business ID
   * @returns Business details
   */
  async getBusinessById(id: string): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        opportunities: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // Only return if approved (or for admin/owner access)
    if (business.status !== 'APPROVED') {
      const error = new Error('Business not available') as any;
      error.statusCode = 404;
      throw error;
    }

    return business;
  }

  /**
   * Get business opportunities
   * @param businessId - Business ID
   * @returns List of opportunities
   */
  async getBusinessOpportunities(businessId: string): Promise<any[]> {
    const opportunities = await prisma.investmentOpportunity.findMany({
      where: {
        businessId,
        status: 'OPEN'
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        _count: {
          select: { investments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return opportunities;
  }

  /**
   * Get business owner's businesses
   * @param ownerId - Owner's user ID
   * @returns List of owner's businesses
   */
  async getOwnerBusinesses(ownerId: string): Promise<any[]> {
    const businesses = await prisma.business.findMany({
      where: { ownerId },
      include: {
        opportunities: {
          select: {
            id: true,
            title: true,
            status: true,
            currentAmount: true,
            targetAmount: true
          }
        },
        _count: {
          select: { opportunities: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return businesses;
  }

  /**
   * Update business (owner only, before approval)
   * @param id - Business ID
   * @param ownerId - Owner's user ID
   * @param data - Updated business data
   * @returns Updated business
   */
  async updateBusiness(id: string, ownerId: string, data: BusinessCreateData): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id }
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (business.ownerId !== ownerId) {
      const error = new Error('Not authorized to update this business') as any;
      error.statusCode = 403;
      throw error;
    }

    if (business.status === 'APPROVED') {
      const error = new Error('Cannot update approved business') as any;
      error.statusCode = 400;
      throw error;
    }

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        location: data.location,
        region: data.region,
        registrationNumber: data.registrationNumber,
        targetAmount: data.targetAmount,
        status: 'PENDING',
        rejectionReason: null
      }
    });

    // Create audit log
    await this.createAuditLog(ownerId, 'BUSINESS_UPDATE', 'Business', id);

    return updatedBusiness;
  }

  /**
   * Create investment opportunity for a business
   * @param businessId - Business ID
   * @param ownerId - Owner's user ID
   * @param data - Opportunity data
   * @returns Created opportunity
   */
  async createOpportunity(
    businessId: string,
    ownerId: string,
    data: OpportunityCreateData
  ): Promise<any> {
    // Verify business ownership and approval
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (business.ownerId !== ownerId) {
      const error = new Error('Not authorized to create opportunity for this business') as any;
      error.statusCode = 403;
      throw error;
    }

    if (business.status !== 'APPROVED') {
      const error = new Error('Business must be approved to create opportunities') as any;
      error.statusCode = 400;
      throw error;
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
      const error = new Error('End date must be after start date') as any;
      error.statusCode = 400;
      throw error;
    }

    // Create opportunity
    const opportunity = await prisma.investmentOpportunity.create({
      data: {
        businessId,
        title: data.title,
        description: data.description,
        minInvestment: data.minInvestment,
        maxInvestment: data.maxInvestment,
        expectedReturn: data.expectedReturn,
        duration: data.duration,
        riskLevel: data.riskLevel,
        targetAmount: data.targetAmount,
        startDate,
        endDate
      }
    });

    // Create audit log
    await this.createAuditLog(ownerId, 'OPPORTUNITY_CREATE', 'InvestmentOpportunity', opportunity.id);

    return opportunity;
  }

  /**
   * Get all pending businesses (admin)
   * @returns List of pending businesses
   */
  async getPendingBusinesses(): Promise<any[]> {
    const businesses = await prisma.business.findMany({
      where: { status: 'PENDING' },
      include: {
        owner: {
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

    return businesses;
  }

  /**
   * Approve business (admin)
   * @param id - Business ID
   * @param adminId - Admin user ID
   * @returns Approved business
   */
  async approveBusiness(id: string, adminId: string): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id }
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (business.status !== 'PENDING') {
      const error = new Error('Business is not pending') as any;
      error.statusCode = 400;
      throw error;
    }

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    // Create audit log
    await this.createAuditLog(
      business.ownerId,
      'BUSINESS_APPROVED',
      'Business',
      id,
      undefined,
      undefined,
      undefined,
      adminId
    );

    return updatedBusiness;
  }

  /**
   * Reject business (admin)
   * @param id - Business ID
   * @param adminId - Admin user ID
   * @param reason - Rejection reason
   * @returns Rejected business
   */
  async rejectBusiness(id: string, adminId: string, reason: string): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id }
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (business.status !== 'PENDING') {
      const error = new Error('Business is not pending') as any;
      error.statusCode = 400;
      throw error;
    }

    const updatedBusiness = await prisma.business.update({
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
      business.ownerId,
      'BUSINESS_REJECTED',
      'Business',
      id,
      JSON.stringify({ reason }),
      undefined,
      undefined,
      adminId
    );

    return updatedBusiness;
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
export const businessService = new BusinessService();

