/**
 * Investment Service for InvestGhanaHub
 * Handles investment operations and portfolio management
 */

import { PrismaClient, TransactionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Types
interface OpportunityFilters {
  category?: string;
  riskLevel?: string;
  minAmount?: number;
  maxAmount?: number;
  page: number;
  limit: number;
}

interface HistoryFilters {
  status?: string;
  page: number;
  limit: number;
}

interface TransactionFilters {
  type?: string;
  page: number;
  limit: number;
}

/**
 * Investment Service Class
 */
class InvestmentService {
  /**
   * List all open investment opportunities
   * @param filters - Filter options
   * @returns Paginated list of opportunities
   */
  async listOpportunities(filters: OpportunityFilters): Promise<any> {
    const { category, riskLevel, minAmount, maxAmount, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = { status: 'OPEN' };
    
    if (riskLevel) where.riskLevel = riskLevel;
    if (minAmount) where.minInvestment = { gte: minAmount };
    if (maxAmount) where.maxInvestment = { lte: maxAmount };

    // If category filter, need to join with business
    if (category) {
      where.business = { category, status: 'APPROVED' };
    } else {
      where.business = { status: 'APPROVED' };
    }

    const [opportunities, total] = await Promise.all([
      prisma.investmentOpportunity.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              category: true,
              location: true,
              region: true
            }
          },
          _count: {
            select: { investments: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.investmentOpportunity.count({ where })
    ]);

    return {
      opportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get opportunity by ID
   * @param id - Opportunity ID
   * @returns Opportunity details
   */
  async getOpportunityById(id: string): Promise<any> {
    const opportunity = await prisma.investmentOpportunity.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            location: true,
            region: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: { investments: true }
        }
      }
    });

    if (!opportunity) {
      const error = new Error('Investment opportunity not found') as any;
      error.statusCode = 404;
      throw error;
    }

    return opportunity;
  }

  /**
   * Make an investment
   * @param investorId - Investor's user ID
   * @param opportunityId - Opportunity ID
   * @param amount - Investment amount in GHS
   * @param ipAddress - Request IP address
   * @returns Investment record and transaction
   */
  async makeInvestment(
    investorId: string,
    opportunityId: string,
    amount: number,
    ipAddress?: string
  ): Promise<any> {
    // Verify investor has approved KYC
    const kyc = await prisma.kYC.findUnique({
      where: { userId: investorId }
    });

    if (!kyc || kyc.status !== 'APPROVED') {
      const error = new Error('KYC must be approved before making investments') as any;
      error.statusCode = 403;
      throw error;
    }

    // Get opportunity and validate
    const opportunity = await prisma.investmentOpportunity.findUnique({
      where: { id: opportunityId },
      include: { business: true }
    });

    if (!opportunity) {
      const error = new Error('Investment opportunity not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (opportunity.status !== 'OPEN') {
      const error = new Error('This investment opportunity is no longer open') as any;
      error.statusCode = 400;
      throw error;
    }

    if (opportunity.business.status !== 'APPROVED') {
      const error = new Error('Business is not approved') as any;
      error.statusCode = 400;
      throw error;
    }

    // Validate investment amount
    if (amount < opportunity.minInvestment) {
      const error = new Error(`Minimum investment is ${opportunity.minInvestment} GHS`) as any;
      error.statusCode = 400;
      throw error;
    }

    if (amount > opportunity.maxInvestment) {
      const error = new Error(`Maximum investment is ${opportunity.maxInvestment} GHS`) as any;
      error.statusCode = 400;
      throw error;
    }

    // Check if opportunity would exceed target
    const remainingAmount = opportunity.targetAmount - opportunity.currentAmount;
    if (amount > remainingAmount) {
      const error = new Error(`Only ${remainingAmount} GHS remaining for this opportunity`) as any;
      error.statusCode = 400;
      throw error;
    }

    // Calculate expected return and maturity date
    const expectedReturn = amount * (1 + opportunity.expectedReturn / 100);
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + opportunity.duration);

    // Create investment and transaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create investment record
      const investment = await tx.investment.create({
        data: {
          investorId,
          opportunityId,
          amount,
          expectedReturn,
          maturityDate
        }
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: investorId,
          investmentId: investment.id,
          type: 'INVESTMENT',
          amount,
          reference: `INV-${uuidv4().substring(0, 8).toUpperCase()}`,
          description: `Investment in ${opportunity.title}`
        }
      });

      // Update opportunity current amount
      await tx.investmentOpportunity.update({
        where: { id: opportunityId },
        data: {
          currentAmount: { increment: amount },
          // Close if target reached
          status: opportunity.currentAmount + amount >= opportunity.targetAmount ? 'FUNDED' : 'OPEN'
        }
      });

      // Update business current amount
      await tx.business.update({
        where: { id: opportunity.businessId },
        data: {
          currentAmount: { increment: amount }
        }
      });

      return { investment, transaction };
    });

    // Create audit log
    await this.createAuditLog(
      investorId,
      'INVESTMENT_MADE',
      'Investment',
      result.investment.id,
      JSON.stringify({ amount, opportunityId }),
      ipAddress
    );

    return {
      investment: result.investment,
      transaction: result.transaction,
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        businessName: opportunity.business.name
      }
    };
  }

  /**
   * Get investor's portfolio summary
   * @param investorId - Investor's user ID
   * @returns Portfolio summary
   */
  async getPortfolio(investorId: string): Promise<any> {
    const investments = await prisma.investment.findMany({
      where: { investorId },
      include: {
        opportunity: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        }
      }
    });

    // Calculate totals
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpectedReturn = investments.reduce((sum, inv) => sum + inv.expectedReturn, 0);
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE');
    const maturedInvestments = investments.filter(inv => inv.status === 'MATURED');

    // Group by category
    const byCategory = investments.reduce((acc: any, inv) => {
      const category = inv.opportunity.business.category;
      if (!acc[category]) {
        acc[category] = { count: 0, amount: 0 };
      }
      acc[category].count++;
      acc[category].amount += inv.amount;
      return acc;
    }, {});

    // Group by risk level
    const byRiskLevel = investments.reduce((acc: any, inv) => {
      const risk = inv.opportunity.riskLevel;
      if (!acc[risk]) {
        acc[risk] = { count: 0, amount: 0 };
      }
      acc[risk].count++;
      acc[risk].amount += inv.amount;
      return acc;
    }, {});

    return {
      summary: {
        totalInvested,
        totalExpectedReturn,
        totalProfit: totalExpectedReturn - totalInvested,
        activeCount: activeInvestments.length,
        maturedCount: maturedInvestments.length,
        totalCount: investments.length
      },
      byCategory,
      byRiskLevel,
      recentInvestments: investments.slice(0, 5).map(inv => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        businessName: inv.opportunity.business.name,
        opportunityTitle: inv.opportunity.title,
        investedAt: inv.investedAt
      }))
    };
  }

  /**
   * Get investor's investment history
   * @param investorId - Investor's user ID
   * @param filters - Filter options
   * @returns Paginated investment history
   */
  async getInvestmentHistory(investorId: string, filters: HistoryFilters): Promise<any> {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = { investorId };
    if (status) where.status = status;

    const [investments, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        include: {
          opportunity: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { investedAt: 'desc' }
      }),
      prisma.investment.count({ where })
    ]);

    return {
      investments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get specific investment details
   * @param id - Investment ID
   * @param investorId - Investor's user ID
   * @returns Investment details
   */
  async getInvestmentById(id: string, investorId: string): Promise<any> {
    const investment = await prisma.investment.findUnique({
      where: { id },
      include: {
        opportunity: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                location: true,
                region: true
              }
            }
          }
        },
        transactions: true
      }
    });

    if (!investment) {
      const error = new Error('Investment not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (investment.investorId !== investorId) {
      const error = new Error('Not authorized to view this investment') as any;
      error.statusCode = 403;
      throw error;
    }

    return investment;
  }

  /**
   * Get investor's transactions
   * @param investorId - Investor's user ID
   * @param filters - Filter options
   * @returns Paginated transactions
   */
  async getTransactions(investorId: string, filters: TransactionFilters): Promise<any> {
    const { type, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = { userId: investorId };
    if (type) where.type = type as TransactionType;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          investment: {
            include: {
              opportunity: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get investor statistics
   * @param investorId - Investor's user ID
   * @returns Investment statistics
   */
  async getInvestorStats(investorId: string): Promise<any> {
    const [investments, transactions] = await Promise.all([
      prisma.investment.findMany({
        where: { investorId },
        include: {
          opportunity: true
        }
      }),
      prisma.transaction.findMany({
        where: { userId: investorId }
      })
    ]);

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpectedReturn = investments.reduce((sum, inv) => sum + inv.expectedReturn, 0);
    const averageReturn = investments.length > 0
      ? investments.reduce((sum, inv) => sum + inv.opportunity.expectedReturn, 0) / investments.length
      : 0;

    // Monthly investment data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = investments
      .filter(inv => inv.investedAt >= sixMonthsAgo)
      .reduce((acc: any, inv) => {
        const month = inv.investedAt.toISOString().substring(0, 7);
        if (!acc[month]) {
          acc[month] = { count: 0, amount: 0 };
        }
        acc[month].count++;
        acc[month].amount += inv.amount;
        return acc;
      }, {});

    return {
      totalInvested,
      totalExpectedReturn,
      totalProfit: totalExpectedReturn - totalInvested,
      averageReturn: Math.round(averageReturn * 100) / 100,
      investmentCount: investments.length,
      transactionCount: transactions.length,
      monthlyData
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
    ipAddress?: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details,
        ipAddress
      }
    });
  }

  /**
   * Get investor's investments (for dashboard)
   * @param investorId - ID of the investor
   * @param filters - Filter options
   * @returns List of investments with stats
   */
  async getInvestorInvestments(investorId: string, filters: any = {}): Promise<any> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId: investorId };
    if (filters.status) {
      where.status = filters.status;
    }

    const investments = await prisma.investment.findMany({
      where,
      include: {
        opportunity: {
          include: {
            business: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.investment.count({ where });

    // Format response
    const formatted = investments.map((inv: any) => ({
      id: inv.id,
      businessName: inv.opportunity?.business?.name || 'Unknown',
      amount: inv.amount,
      investedAt: inv.createdAt,
      status: inv.status,
      expectedReturn: inv.expectedReturn || 0,
      maturityDate: inv.maturityDate,
      returnPercentage: inv.amount > 0 ? ((inv.expectedReturn || 0) / inv.amount) * 100 : 0
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
   * Get portfolio summary (for dashboard)
   * @param investorId - ID of the investor
   * @returns Portfolio statistics
   */
  async getPortfolioSummary(investorId: string): Promise<any> {
    const investments = await prisma.investment.findMany({
      where: { investorId: investorId }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalReturns = investments.reduce((sum, inv) => sum + (inv.expectedReturn || 0), 0);
    const activeCount = investments.filter((inv: any) => inv.status === 'ACTIVE').length;
    const portfolioValue = totalInvested + totalReturns;
    const roi = totalInvested > 0 ? ((totalReturns / totalInvested) * 100) : 0;

    return {
      totalInvested,
      totalReturns,
      activeInvestments: activeCount,
      portfolioValue,
      roi: parseFloat(roi.toFixed(2))
    };
  }
}

// Export singleton instance
export const investmentService = new InvestmentService();

