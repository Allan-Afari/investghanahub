import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PlatformMetrics {
  totalUsers: number;
  totalBusinesses: number;
  totalInvestments: number;
  totalInvestmentAmount: number;
  activeInvestments: number;
  averageInvestmentSize: number;
  topIndustries: Array<{ industry: string; count: number; totalAmount: number }>;
  monthlyGrowth: Array<{ month: string; users: number; investments: number; amount: number }>;
  userDistribution: Record<string, number>;
  businessStatusDistribution: Record<string, number>;
}

export interface AdminAnalytics {
  platformHealth: {
    userGrowthRate: number;
    businessGrowthRate: number;
    investmentGrowthRate: number;
    revenueGrowthRate: number;
  };
  userMetrics: {
    totalUsers: number;
    verifiedUsers: number;
    premiumUsers: number;
    activeUsers: number;
    userByRole: Record<string, number>;
    userByRegion: Record<string, number>;
  };
  businessMetrics: {
    totalBusinesses: number;
    approvedBusinesses: number;
    pendingBusinesses: number;
    businessesByIndustry: Record<string, number>;
    businessesByStage: Record<string, number>;
    averageFundingGoal: number;
    totalFundingRaised: number;
  };
  investmentMetrics: {
    totalInvestments: number;
    totalInvestmentAmount: number;
    activeInvestments: number;
    completedInvestments: number;
    averageROI: number;
    investmentsBySize: Record<string, number>;
    investmentsByIndustry: Record<string, number>;
  };
  financialMetrics: {
    platformRevenue: number;
    commissionRevenue: number;
    premiumRevenue: number;
    transactionFees: number;
    monthlyRevenue: Array<{ month: string; revenue: number; source: string }>;
  };
}

export interface FinancialMetrics {
  platformRevenue: number;
  commissionRevenue: number;
  premiumRevenue: number;
  transactionFees: number;
  monthlyRevenue: Array<{ month: string; revenue: number; source: string }>;
}

export interface BusinessAnalytics {
  overview: {
    totalInvestments: number;
    totalAmount: number;
    averageInvestment: number;
    fundingProgress: number;
    investorCount: number;
  };
  investorDemographics: {
    byRegion: Record<string, number>;
    byInvestmentSize: Record<string, number>;
    newVsReturning: { new: number; returning: number };
  };
  performance: {
    monthlyInvestments: Array<{ month: string; count: number; amount: number }>;
    investmentTrends: Array<{ period: string; amount: number; investors: number }>;
    completionRate: number;
    averageTimeToFund: number;
  };
  engagement: {
    questionsAsked: number;
    averageResponseTime: number;
    progressUpdates: number;
    viewCount: number;
    shareCount: number;
  };
}

export class AnalyticsService {
  /**
   * Get comprehensive platform metrics
   */
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    try {
      const [
        totalUsers,
        totalBusinesses,
        totalInvestments,
        totalInvestmentAmount,
        activeInvestments,
        topIndustries,
        monthlyGrowth,
        userDistribution,
        businessStatusDistribution
      ] = await Promise.all([
        prisma.user.count(),
        prisma.business.count(),
        prisma.investment.count(),
        prisma.investment.aggregate({ _sum: { amount: true } }),
        prisma.investment.count({ where: { status: 'ACTIVE' } }),
        this.getTopIndustries(),
        this.getMonthlyGrowth(),
        this.getUserDistribution(),
        this.getBusinessStatusDistribution()
      ]);

      const averageInvestmentSize = totalInvestments > 0 
        ? (totalInvestmentAmount._sum.amount || 0) / totalInvestments 
        : 0;

      return {
        totalUsers,
        totalBusinesses,
        totalInvestments,
        totalInvestmentAmount: totalInvestmentAmount._sum.amount || 0,
        activeInvestments,
        averageInvestmentSize,
        topIndustries,
        monthlyGrowth,
        userDistribution,
        businessStatusDistribution
      };
    } catch (error) {
      console.error('Get platform metrics error:', error);
      throw new Error('Failed to retrieve platform metrics');
    }
  }

  /**
   * Get comprehensive admin analytics
   */
  async getAdminAnalytics(): Promise<AdminAnalytics> {
    try {
      const [
        platformHealth,
        userMetrics,
        businessMetrics,
        investmentMetrics,
        financialMetrics
      ] = await Promise.all([
        this.getPlatformHealth(),
        this.getUserMetrics(),
        this.getBusinessMetrics(),
        this.getInvestmentMetrics(),
        this.getFinancialMetrics()
      ]);

      return {
        platformHealth,
        userMetrics,
        businessMetrics,
        investmentMetrics,
        financialMetrics
      };
    } catch (error) {
      console.error('Get admin analytics error:', error);
      throw new Error('Failed to retrieve admin analytics');
    }
  }

  /**
   * Get business-specific analytics
   */
  async getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
    try {
      const [
        overview,
        investorDemographics,
        performance,
        engagement
      ] = await Promise.all([
        this.getBusinessOverview(businessId),
        this.getInvestorDemographics(businessId),
        this.getBusinessPerformance(businessId),
        this.getBusinessEngagement(businessId)
      ]);

      return {
        overview,
        investorDemographics,
        performance,
        engagement
      };
    } catch (error) {
      console.error('Get business analytics error:', error);
      throw new Error('Failed to retrieve business analytics');
    }
  }

  /**
   * Get platform health metrics
   */
  private async getPlatformHealth(): Promise<AdminAnalytics['platformHealth']> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const [
      currentUsers,
      lastMonthUsers,
      currentBusinesses,
      lastMonthBusinesses,
      currentInvestments,
      lastMonthInvestments,
      currentRevenue,
      lastMonthRevenue
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: lastMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: twoMonthsAgo, lt: lastMonth } } }),
      prisma.business.count({ where: { createdAt: { gte: lastMonth } } }),
      prisma.business.count({ where: { createdAt: { gte: twoMonthsAgo, lt: lastMonth } } }),
      prisma.investment.count({ where: { createdAt: { gte: lastMonth } } }),
      prisma.investment.count({ where: { createdAt: { gte: twoMonthsAgo, lt: lastMonth } } }),
      this.getMonthlyRevenue(lastMonth),
      this.getMonthlyRevenue(twoMonthsAgo, lastMonth)
    ]);

    const userGrowthRate = lastMonthUsers > 0 ? ((currentUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;
    const businessGrowthRate = lastMonthBusinesses > 0 ? ((currentBusinesses - lastMonthBusinesses) / lastMonthBusinesses) * 100 : 0;
    const investmentGrowthRate = lastMonthInvestments > 0 ? ((currentInvestments - lastMonthInvestments) / lastMonthInvestments) * 100 : 0;
    const revenueGrowthRate = lastMonthRevenue > 0 ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    return {
      userGrowthRate,
      businessGrowthRate,
      investmentGrowthRate,
      revenueGrowthRate
    };
  }

  /**
   * Get user metrics
   */
  public async getUserMetrics(): Promise<AdminAnalytics['userMetrics']> {
    const [
      totalUsers,
      verifiedUsers,
      premiumUsers,
      activeUsers,
      userByRole,
      userByRegion
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.user.count({ where: { isPremium: true } }),
      this.getActiveUsersCount(),
      this.getUsersByRole(),
      this.getUsersByRegion()
    ]);

    return {
      totalUsers,
      verifiedUsers,
      premiumUsers,
      activeUsers,
      userByRole,
      userByRegion
    };
  }

  /**
   * Get business metrics
   */
  public async getBusinessMetrics(): Promise<AdminAnalytics['businessMetrics']> {
    const [
      totalBusinesses,
      approvedBusinesses,
      pendingBusinesses,
      businessesByIndustry,
      businessesByStage,
      averageFundingGoal,
      totalFundingRaised
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { status: 'APPROVED' } }),
      prisma.business.count({ where: { status: 'PENDING' } }),
      this.getBusinessesByIndustry(),
      this.getBusinessesByStage(),
      prisma.business.aggregate({ _avg: { targetAmount: true } }),
      prisma.investment.aggregate({ _sum: { amount: true } })
    ]);

    return {
      totalBusinesses,
      approvedBusinesses,
      pendingBusinesses,
      businessesByIndustry,
      businessesByStage,
      averageFundingGoal: averageFundingGoal._avg.targetAmount || 0,
      totalFundingRaised: totalFundingRaised._sum.amount || 0
    };
  }

  /**
   * Get investment metrics
   */
  private async getInvestmentMetrics(): Promise<AdminAnalytics['investmentMetrics']> {
    const [
      totalInvestments,
      totalInvestmentAmount,
      activeInvestments,
      completedInvestments,
      averageROI,
      investmentsBySize,
      investmentsByIndustry
    ] = await Promise.all([
      prisma.investment.count(),
      prisma.investment.aggregate({ _sum: { amount: true } }),
      prisma.investment.count({ where: { status: 'ACTIVE' } }),
      prisma.investment.count({ where: { status: 'COMPLETED' } }),
      this.getAverageROI(),
      this.getInvestmentsBySize(),
      this.getInvestmentsByIndustry()
    ]);

    return {
      totalInvestments,
      totalInvestmentAmount: totalInvestmentAmount._sum.amount || 0,
      activeInvestments,
      completedInvestments,
      averageROI,
      investmentsBySize,
      investmentsByIndustry
    };
  }

  /**
   * Get financial metrics
   */
  public async getFinancialMetrics(): Promise<FinancialMetrics> {
    const [
      platformRevenue,
      commissionRevenue,
      premiumRevenue,
      transactionFees,
      monthlyRevenue
    ] = await Promise.all([
      this.getPlatformRevenue(),
      this.getCommissionRevenue(),
      this.getPremiumRevenue(),
      this.getTransactionFees(),
      this.getMonthlyRevenueData()
    ]);

    return {
      platformRevenue,
      commissionRevenue,
      premiumRevenue,
      transactionFees,
      monthlyRevenue
    };
  }

  /**
   * Helper methods for analytics calculations
   */
  private async getTopIndustries(): Promise<Array<{ industry: string; count: number; totalAmount: number }>> {
    const industries = await prisma.business.groupBy({
      by: ['industry'],
      _count: { id: true },
      _sum: { targetAmount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    return industries.map(item => ({
      industry: item.industry || 'OTHER',
      count: item._count.id,
      totalAmount: item._sum.targetAmount || 0
    }));
  }

  private async getMonthlyGrowth(): Promise<Array<{ month: string; users: number; investments: number; amount: number }>> {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const [users, investments, investmentAmount] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              gte: monthStart,
              lt: monthEnd
            }
          }
        }),
        prisma.investment.count({
          where: {
            createdAt: {
              gte: monthStart,
              lt: monthEnd
            }
          }
        }),
        prisma.investment.aggregate({
          where: {
            createdAt: {
              gte: monthStart,
              lt: monthEnd
            }
          },
          _sum: { amount: true }
        })
      ]);

      months.push({
        month: monthKey,
        users,
        investments,
        amount: investmentAmount._sum.amount || 0
      });
    }

    return months;
  }

  private async getUserDistribution(): Promise<Record<string, number>> {
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    return roles.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getBusinessStatusDistribution(): Promise<Record<string, number>> {
    const statuses = await prisma.business.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    return statuses.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getActiveUsersCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return prisma.user.count({
      where: {
        OR: [
          { investments: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { businesses: { some: { updatedAt: { gte: thirtyDaysAgo } } } },
          { sentMessages: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { receivedMessages: { some: { createdAt: { gte: thirtyDaysAgo } } } }
        ]
      }
    });
  }

  private async getUsersByRole(): Promise<Record<string, number>> {
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    return roles.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getUsersByRegion(): Promise<Record<string, number>> {
    // This would require region data in user model - simplified for now
    const regions = await prisma.business.groupBy({
      by: ['region'],
      _count: { id: true }
    });

    return regions.reduce((acc, item) => {
      acc[item.region] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getBusinessesByIndustry(): Promise<Record<string, number>> {
    const industries = await prisma.business.groupBy({
      by: ['industry'],
      _count: { id: true }
    });

    return industries.reduce((acc, item) => {
      acc[item.industry || 'OTHER'] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getBusinessesByStage(): Promise<Record<string, number>> {
    const stages = await prisma.business.groupBy({
      by: ['stage'],
      _count: { id: true }
    });

    return stages.reduce((acc, item) => {
      acc[item.stage || 'UNKNOWN'] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getAverageROI(): Promise<number> {
    // Simplified ROI calculation - in production this would be more complex
    const completedInvestments = await prisma.investment.findMany({
      where: { status: 'COMPLETED' },
      include: { opportunity: { select: { expectedReturn: true } } }
    });

    if (completedInvestments.length === 0) return 0;

    const totalROI = completedInvestments.reduce((sum, inv) => {
      return sum + (inv.opportunity.expectedReturn || 0);
    }, 0);

    return totalROI / completedInvestments.length;
  }

  private async getInvestmentsBySize(): Promise<Record<string, number>> {
    const investments = await prisma.investment.findMany({
      select: { amount: true }
    });

    const sizeDistribution = {
      'SMALL': 0,    // < 1000 GHS
      'MEDIUM': 0,   // 1000-10000 GHS
      'LARGE': 0,    // > 10000 GHS
      'VERY_LARGE': 0 // > 50000 GHS
    };

    investments.forEach(inv => {
      if (inv.amount < 1000) sizeDistribution.SMALL++;
      else if (inv.amount < 10000) sizeDistribution.MEDIUM++;
      else if (inv.amount < 50000) sizeDistribution.LARGE++;
      else sizeDistribution.VERY_LARGE++;
    });

    return sizeDistribution;
  }

  private async getInvestmentsByIndustry(): Promise<Record<string, number>> {
    const result = await prisma.investment.findMany({
      include: {
        opportunity: {
          include: {
            business: {
              select: { industry: true }
            }
          }
        }
      }
    });

    const industryCount: Record<string, number> = {};
    result.forEach(inv => {
      const industry = inv.opportunity.business.industry || 'OTHER';
      industryCount[industry] = (industryCount[industry] || 0) + 1;
    });

    return industryCount;
  }

  private async getPlatformRevenue(): Promise<number> {
    // Simplified revenue calculation
    const totalInvestments = await prisma.investment.aggregate({
      _sum: { amount: true }
    });

    return (totalInvestments._sum.amount || 0) * 0.05; // 5% platform fee
  }

  private async getCommissionRevenue(): Promise<number> {
    return this.getPlatformRevenue(); // Simplified - same as platform revenue
  }

  private async getPremiumRevenue(): Promise<number> {
    const premiumUsers = await prisma.user.count({
      where: { isPremium: true }
    });

    return premiumUsers * 50; // 50 GHS per month per premium user
  }

  private async getTransactionFees(): Promise<number> {
    const totalTransactions = await prisma.payment.count({
      where: { status: 'SUCCESS' }
    });

    return totalTransactions * 2.5; // 2.5 GHS per transaction
  }

  private async getMonthlyRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    const whereClause: any = {};
    if (startDate) whereClause.gte = startDate;
    if (endDate) whereClause.lt = endDate;

    const investments = await prisma.investment.aggregate({
      where: {
        createdAt: whereClause
      },
      _sum: { amount: true }
    });

    return (investments._sum.amount || 0) * 0.05; // 5% platform fee
  }

  private async getMonthlyRevenueData(): Promise<Array<{ month: string; revenue: number; source: string }>> {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const revenue = await this.getMonthlyRevenue(monthStart, monthEnd);

      months.push({
        month: monthKey,
        revenue,
        source: 'Platform Fees'
      });
    }

    return months;
  }

  private async getBusinessOverview(businessId: string): Promise<BusinessAnalytics['overview']> {
    const [investments, totalAmount, investorCount] = await Promise.all([
      prisma.investment.count({
        where: {
          opportunity: {
            businessId
          }
        }
      }),
      prisma.investment.aggregate({
        where: {
          opportunity: {
            businessId
          }
        },
        _sum: { amount: true }
      }),
      prisma.investment.findMany({
        where: {
          opportunity: {
            businessId
          }
        },
        select: { investorId: true }
      }).then(invs => new Set(invs.map(inv => inv.investorId)).size)
    ]);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { targetAmount: true, currentAmount: true }
    });

    const averageInvestment = investments > 0 ? (totalAmount._sum.amount || 0) / investments : 0;
    const fundingProgress = business ? (business.currentAmount / business.targetAmount) * 100 : 0;

    return {
      totalInvestments: investments,
      totalAmount: totalAmount._sum.amount || 0,
      averageInvestment,
      fundingProgress,
      investorCount
    };
  }

  private async getInvestorDemographics(businessId: string): Promise<BusinessAnalytics['investorDemographics']> {
    // Simplified demographics - would need more user data for detailed analysis
    const investments = await prisma.investment.findMany({
      where: {
        opportunity: {
          businessId
        }
      },
      include: {
        investor: {
          select: { region: true }
        }
      }
    });

    const byRegion: Record<string, number> = {};
    const byInvestmentSize: Record<string, number> = {
      'SMALL': 0,
      'MEDIUM': 0,
      'LARGE': 0
    };

    investments.forEach(inv => {
      // Region distribution
      const region = inv.investor.region || 'UNKNOWN';
      byRegion[region] = (byRegion[region] || 0) + 1;

      // Investment size distribution
      if (inv.amount < 1000) byInvestmentSize.SMALL++;
      else if (inv.amount < 10000) byInvestmentSize.MEDIUM++;
      else byInvestmentSize.LARGE++;
    });

    return {
      byRegion,
      byInvestmentSize,
      newVsReturning: { new: 0, returning: 0 } // Simplified
    };
  }

  private async getBusinessPerformance(businessId: string): Promise<BusinessAnalytics['performance']> {
    const investments = await prisma.investment.findMany({
      where: {
        opportunity: {
          businessId
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const monthlyInvestments = this.groupInvestmentsByMonth(investments);
    const investmentTrends = this.calculateInvestmentTrends(investments);
    const completionRate = 100; // Simplified - all investments are considered "completed" for demo
    const averageTimeToFund = this.calculateAverageTimeToFund(investments);

    return {
      monthlyInvestments,
      investmentTrends,
      completionRate,
      averageTimeToFund
    };
  }

  private async getBusinessEngagement(businessId: string): Promise<BusinessAnalytics['engagement']> {
    const [questionsAsked, progressUpdates] = await Promise.all([
      prisma.question.count({
        where: { businessId }
      }),
      prisma.progressUpdate.count({
        where: { businessId }
      })
    ]);

    return {
      questionsAsked,
      averageResponseTime: 24, // Simplified - 24 hours average response time
      progressUpdates,
      viewCount: 0, // Would need view tracking
      shareCount: 0  // Would need share tracking
    };
  }

  private groupInvestmentsByMonth(investments: any[]): Array<{ month: string; count: number; amount: number }> {
    const monthlyData: Record<string, { count: number; amount: number }> = {};
    
    investments.forEach(inv => {
      const monthKey = inv.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, amount: 0 };
      }
      monthlyData[monthKey].count++;
      monthlyData[monthKey].amount += inv.amount;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount
    }));
  }

  private calculateInvestmentTrends(investments: any[]): Array<{ period: string; amount: number; investors: number }> {
    // Simplified trend calculation
    return investments.slice(-6).map((inv, index) => ({
      period: `Period ${index + 1}`,
      amount: inv.amount,
      investors: 1
    }));
  }

  private calculateAverageTimeToFund(investments: any[]): number {
    if (investments.length === 0) return 0;
    
    // Simplified calculation - would need business creation date for accurate calculation
    return 30; // 30 days average time to fund
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
