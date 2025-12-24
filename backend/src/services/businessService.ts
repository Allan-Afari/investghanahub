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
  industry?: string;
  stage?: string;
  location: string;
  region: string;
  registrationNumber?: string;
  targetAmount: number;
  minInvestment?: number;
  valuation?: number;
  equityOffered?: number;
  useOfFunds?: string;
  riskDisclosure?: string;
  financialProjections?: any;
  revenueHistory?: any;
  documents?: any;
}

interface OpportunityCreateData {
  title: string;
  description: string;
  minInvestment: number;
  maxInvestment: number;
  investmentModel?: 'EQUITY' | 'DEBT' | 'REVENUE_SHARE';
  equityPercentage?: number;
  interestRate?: number;
  revenueSharePercentage?: number;
  expectedReturn?: number;
  duration: number;
  riskLevel: string;
  targetAmount: number;
  startDate: string;
  endDate: string;
}

interface ListFilters {
  category?: string;
  industry?: string;
  stage?: string;
  region?: string;
  minInvestment?: number;
  maxInvestment?: number;
  riskLevel?: string;
  isFeatured?: boolean;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'targetAmount' | 'currentAmount';
  sortOrder?: 'asc' | 'desc';
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

    // Validate business stage
    const validStages = ['IDEA', 'STARTUP', 'GROWTH', 'ESTABLISHED'];
    if (data.stage && !validStages.includes(data.stage)) {
      const error = new Error('Invalid business stage') as any;
      error.statusCode = 400;
      throw error;
    }

    // Create business
    const business = await prisma.business.create({
      data: {
        ownerId,
        name: data.name,
        description: data.description,
        category: data.category,
        industry: data.industry,
        stage: data.stage,
        location: data.location,
        region: data.region,
        registrationNumber: data.registrationNumber,
        targetAmount: data.targetAmount,
        minInvestment: data.minInvestment,
        valuation: data.valuation,
        equityOffered: data.equityOffered,
        useOfFunds: data.useOfFunds,
        riskDisclosure: data.riskDisclosure,
        financialProjections: data.financialProjections,
        revenueHistory: data.revenueHistory,
        documents: data.documents
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
    const { 
      category, 
      industry, 
      stage, 
      region, 
      minInvestment, 
      maxInvestment, 
      riskLevel, 
      isFeatured,
      page, 
      limit, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = { status: 'APPROVED' };
    
    // Apply filters
    if (category) where.category = category;
    if (industry) where.industry = industry;
    if (stage) where.stage = stage;
    if (region) where.region = region;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    
    // Investment range filters
    if (minInvestment || maxInvestment) {
      where.minInvestment = {};
      if (minInvestment) where.minInvestment.gte = minInvestment;
      if (maxInvestment) where.minInvestment.lte = maxInvestment;
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              verificationStatus: true
            }
          },
          opportunities: {
            where: { status: 'OPEN' },
            select: {
              id: true,
              title: true,
              minInvestment: true,
              expectedReturn: true,
              riskLevel: true,
              targetAmount: true,
              currentAmount: true
            }
          },
          _count: {
            select: { opportunities: true }
          }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
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

    const minInvestment = data.minInvestment ?? (data as any).minimumInvestment;
    const maxInvestment = data.maxInvestment ?? (data as any).investmentAmount;
    const targetAmount = data.targetAmount ?? (data as any).investmentAmount;
    const duration = data.duration ?? (data as any).investmentPeriod;

    const startDateValue = data.startDate ?? new Date().toISOString();
    const endDateValue = data.endDate ?? (data as any).deadline;

    // Validate dates
    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    if (!minInvestment || !maxInvestment || !targetAmount || !duration) {
      const error = new Error('Missing required opportunity fields') as any;
      error.statusCode = 400;
      throw error;
    }

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
        minInvestment,
        maxInvestment,
        investmentModel: data.investmentModel || 'EQUITY',
        equityPercentage: data.equityPercentage,
        interestRate: data.interestRate,
        revenueSharePercentage: data.revenueSharePercentage,
        expectedReturn: data.expectedReturn,
        duration,
        riskLevel: data.riskLevel,
        targetAmount,
        startDate,
        endDate
      } as any
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

  /**
   * Get business info for owner (dashboard)
   * @param ownerId - Owner's ID
   * @returns Business information
   */
  async getOwnerBusinessInfo(ownerId: string): Promise<any> {
    const business = await prisma.business.findFirst({
      where: { ownerId }
    });

    if (!business) return null;

    // Get investor count
    const opportunities = await prisma.investmentOpportunity.findMany({
      where: { businessId: business.id }
    });

    const investments = await prisma.investment.findMany({
      where: {
        opportunityId: {
          in: opportunities.map((o: any) => o.id)
        }
      }
    });

    const uniqueInvestors = new Set(investments.map(i => i.investorId)).size;

    return {
      id: business.id,
      name: business.name,
      description: business.description,
      category: business.category,
      targetCapital: business.targetAmount,
      raisedAmount: investments.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      status: business.status,
      createdAt: business.createdAt,
      investors: uniqueInvestors
    };
  }

  /**
   * Get owner's opportunities (dashboard)
   * @param ownerId - Owner's ID
   * @param filters - Filter options
   * @returns List of opportunities
   */
  async getOwnerOpportunities(ownerId: string, filters: any = {}): Promise<any> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Get owner's businesses first
    const businesses = await prisma.business.findMany({
      where: { ownerId }
    });

    const businessIds = businesses.map(b => b.id);

    const where: any = { businessId: { in: businessIds } };
    if (filters.status) {
      where.status = filters.status;
    }

    const opportunities = await prisma.investmentOpportunity.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.investmentOpportunity.count({ where });

    // Get investment counts
    const formatted = await Promise.all(opportunities.map(async (opp: any) => {
      const investments = await prisma.investment.findMany({
        where: { opportunityId: opp.id }
      });

      const raisedAmount = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

      return {
        id: opp.id,
        title: opp.title,
        description: opp.description,
        targetAmount: opp.targetAmount,
        raisedAmount,
        investorCount: investments.length,
        status: opp.status,
        expectedROI: opp.expectedReturn || 0,
        createdAt: opp.createdAt
      };
    }));

    return {
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Compare multiple businesses side-by-side
   * @param businessIds - Array of business IDs to compare
   * @returns Comparison data
   */
  async compareBusinesses(businessIds: string[]): Promise<any> {
    const businesses = await prisma.business.findMany({
      where: {
        id: { in: businessIds },
        status: 'APPROVED'
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            verificationStatus: true
          }
        },
        opportunities: {
          where: { status: 'OPEN' },
          select: {
            id: true,
            title: true,
            minInvestment: true,
            maxInvestment: true,
            expectedReturn: true,
            riskLevel: true,
            targetAmount: true,
            currentAmount: true
          }
        },
        _count: {
          select: { opportunities: true }
        }
      }
    });

    if (businesses.length === 0) {
      const error = new Error('No valid businesses found for comparison') as any;
      error.statusCode = 404;
      throw error;
    }

    // Format comparison data
    const comparison = businesses.map(business => ({
      id: business.id,
      name: business.name,
      description: business.description,
      category: business.category,
      industry: business.industry || null,
      stage: business.stage || null,
      location: business.location,
      region: business.region,
      targetAmount: business.targetAmount,
      currentAmount: business.currentAmount,
      minInvestment: business.minInvestment || null,
      valuation: business.valuation || null,
      equityOffered: business.equityOffered || null,
      useOfFunds: business.useOfFunds || null,
      riskDisclosure: business.riskDisclosure || null,
      owner: business.owner || null,
      opportunities: business.opportunities || [],
      opportunityCount: business._count?.opportunities || 0,
      fundingProgress: (business.currentAmount / business.targetAmount) * 100,
      createdAt: business.createdAt
    }));

    return {
      businesses: comparison,
      comparisonCount: comparison.length
    };
  }

  /**
   * Get smart recommendations for investors based on their profile
   * @param userId - User ID
   * @param limit - Number of recommendations
   * @returns Recommended businesses
   */
  async getRecommendations(userId: string, limit: number = 5): Promise<any> {
    // Get user's investment history to understand preferences
    const userInvestments = await prisma.investment.findMany({
      where: { investorId: userId },
      include: {
        opportunity: {
          include: {
            business: true
          }
        }
      }
    });

    // Get user's watchlist to understand interests
    const userWatchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        business: true
      }
    });

    // Extract preferences from investment history and watchlist
    const preferredCategories = new Set<string>();
    const preferredIndustries = new Set<string>();
    const preferredStages = new Set<string>();
    const preferredRegions = new Set<string>();

    // Analyze investment history
    userInvestments.forEach(investment => {
      const business = investment.opportunity.business;
      preferredCategories.add(business.category);
      if (business.industry) preferredIndustries.add(business.industry);
      if (business.stage) preferredStages.add(business.stage);
      preferredRegions.add(business.region);
    });

    // Analyze watchlist
    userWatchlist.forEach(item => {
      const business = item.business;
      preferredCategories.add(business.category);
      if (business.industry) preferredIndustries.add(business.industry);
      if (business.stage) preferredStages.add(business.stage);
      preferredRegions.add(business.region);
    });

    // Get businesses the user hasn't invested in or watched
    const excludedBusinessIds = new Set([
      ...userInvestments.map(i => i.opportunity.businessId),
      ...userWatchlist.map(w => w.businessId)
    ]);

    // Build recommendation query
    const where: any = {
      status: 'APPROVED',
      id: { notIn: Array.from(excludedBusinessIds) }
    };

    // Add preference-based filters if available
    const orConditions: any[] = [];
    
    if (preferredCategories.size > 0) {
      orConditions.push({ category: { in: Array.from(preferredCategories) } });
    }
    
    if (preferredIndustries.size > 0) {
      orConditions.push({ industry: { in: Array.from(preferredIndustries) } });
    }
    
    if (preferredStages.size > 0) {
      orConditions.push({ stage: { in: Array.from(preferredStages) } });
    }

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    const recommendations = await prisma.business.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            verificationStatus: true
          }
        },
        opportunities: {
          where: { status: 'OPEN' },
          select: {
            id: true,
            title: true,
            minInvestment: true,
            expectedReturn: true,
            riskLevel: true,
            targetAmount: true,
            currentAmount: true
          }
        },
        _count: {
          select: { opportunities: true }
        }
      },
      take: limit,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculate recommendation scores
    const scoredRecommendations = recommendations.map(business => {
      let score = 0;
      
      // Category match
      if (preferredCategories.has(business.category)) score += 3;
      
      // Industry match
      if (business.industry && preferredIndustries.has(business.industry)) score += 2;
      
      // Stage match
      if (business.stage && preferredStages.has(business.stage)) score += 2;
      
      // Region match
      if (preferredRegions.has(business.region)) score += 1;
      
      // Featured bonus
      if (business.isFeatured) score += 1;
      
      return {
        ...business,
        recommendationScore: score
      };
    });

    // Sort by recommendation score
    scoredRecommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return {
      recommendations: scoredRecommendations,
      count: scoredRecommendations.length,
      preferences: {
        categories: Array.from(preferredCategories),
        industries: Array.from(preferredIndustries),
        stages: Array.from(preferredStages),
        regions: Array.from(preferredRegions)
      }
    };
  }

  /**
   * Feature a business (admin only)
   * @param businessId - Business ID
   * @param adminId - Admin user ID
   * @param duration - Duration in days
   * @returns Updated business
   */
  async featureBusiness(businessId: string, adminId: string, duration: number): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (business.status !== 'APPROVED') {
      const error = new Error('Only approved businesses can be featured') as any;
      error.statusCode = 400;
      throw error;
    }

    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + duration);

    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: {
        isFeatured: true,
        featuredUntil: featuredUntil
      }
    });

    // Create audit log
    await this.createAuditLog(
      adminId,
      'BUSINESS_FEATURED',
      'Business',
      businessId,
      JSON.stringify({ duration, featuredUntil }),
      undefined,
      undefined,
      adminId
    );

    return updatedBusiness;
  }
}

// Export singleton instance
export const businessService = new BusinessService();

