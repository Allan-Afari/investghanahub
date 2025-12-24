import { PrismaClient } from '@prisma/client';
import { escrowService } from './escrowService';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

export interface InvestmentMetrics {
  totalInvested: number;
  activeInvestments: number;
  completedInvestments: number;
  totalReturns: number;
  averageROI: number;
  portfolioValue: number;
}

export interface InvestmentPerformance {
  investmentId: string;
  businessName: string;
  amountInvested: number;
  currentValue: number;
  returns: number;
  roi: number;
  status: string;
  investedAt: Date;
  maturityDate?: Date;
}

export interface PortfolioAnalytics {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  overallROI: number;
  diversificationScore: number;
  riskDistribution: Record<string, number>;
  performanceByIndustry: Record<string, any>;
  monthlyReturns: Array<{ month: string; returns: number }>;
}

export class InvestmentTrackingService {
  /**
   * Get user's investment metrics
   */
  async getUserInvestmentMetrics(userId: string): Promise<InvestmentMetrics> {
    const investments = await prisma.investment.findMany({
      where: { investorId: userId },
      include: {
        opportunity: {
          include: {
            business: true
          }
        }
      }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length;
    const completedInvestments = investments.filter(inv => inv.status === 'COMPLETED').length;
    
    // Calculate returns (simplified - in production, this would be more complex)
    const totalReturns = investments.reduce((sum, inv) => {
      const actualReturn = (inv as any).actualReturn as number | undefined;
      if (inv.status === 'COMPLETED' && typeof actualReturn === 'number') {
        return sum + actualReturn;
      }
      return sum;
    }, 0);

    const averageROI = investments.length > 0 
      ? (totalReturns / totalInvested) * 100 
      : 0;

    const portfolioValue = totalInvested + totalReturns;

    return {
      totalInvested,
      activeInvestments,
      completedInvestments,
      totalReturns,
      averageROI,
      portfolioValue
    };
  }

  /**
   * Get detailed investment performance for user
   */
  async getInvestmentPerformance(userId: string): Promise<InvestmentPerformance[]> {
    const investments = await prisma.investment.findMany({
      where: { investorId: userId },
      include: {
        opportunity: {
          include: {
            business: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return investments.map(inv => {
      const currentValue = this.calculateCurrentValue(inv);
      const returns = currentValue - inv.amount;
      const roi = inv.amount > 0 ? (returns / inv.amount) * 100 : 0;

      return {
        investmentId: inv.id,
        businessName: inv.opportunity.business.name,
        amountInvested: inv.amount,
        currentValue,
        returns,
        roi,
        status: inv.status,
        investedAt: inv.createdAt,
        maturityDate: inv.maturityDate
      };
    });
  }

  /**
   * Get comprehensive portfolio analytics
   */
  async getPortfolioAnalytics(userId: string): Promise<PortfolioAnalytics> {
    const investments = await prisma.investment.findMany({
      where: { investorId: userId },
      include: {
        opportunity: {
          include: {
            business: true
          }
        }
      }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const currentValue = investments.reduce((sum, inv) => sum + this.calculateCurrentValue(inv), 0);
    const totalReturns = currentValue - totalInvested;
    const overallROI = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    // Calculate diversification score
    const industries = new Set(investments.map(inv => ((inv.opportunity.business as any).industry as string | undefined) || 'OTHER'));
    const diversificationScore = Math.min((industries.size / 5) * 100, 100); // Max 5 industries for full score

    // Risk distribution
    const riskDistribution: Record<string, number> = {};
    investments.forEach(inv => {
      const risk = this.getRiskLevel(inv.opportunity.business);
      riskDistribution[risk] = (riskDistribution[risk] || 0) + inv.amount;
    });

    // Performance by industry
    const performanceByIndustry: Record<string, any> = {};
    investments.forEach(inv => {
      const industry = ((inv.opportunity.business as any).industry as string | undefined) || 'OTHER';
      if (!performanceByIndustry[industry]) {
        performanceByIndustry[industry] = {
          totalInvested: 0,
          currentValue: 0,
          count: 0
        };
      }
      performanceByIndustry[industry].totalInvested += inv.amount;
      performanceByIndustry[industry].currentValue += this.calculateCurrentValue(inv);
      performanceByIndustry[industry].count += 1;
    });

    // Calculate ROI for each industry
    Object.keys(performanceByIndustry).forEach(industry => {
      const data = performanceByIndustry[industry];
      data.roi = data.totalInvested > 0 
        ? ((data.currentValue - data.totalInvested) / data.totalInvested) * 100 
        : 0;
    });

    // Monthly returns (simplified - last 6 months)
    const monthlyReturns = this.calculateMonthlyReturns(investments);

    return {
      totalInvested,
      currentValue,
      totalReturns,
      overallROI,
      diversificationScore,
      riskDistribution,
      performanceByIndustry,
      monthlyReturns
    };
  }

  /**
   * Track investment milestones and send notifications
   */
  async trackInvestmentMilestones(): Promise<void> {
    const investments = await prisma.investment.findMany({
      where: { status: 'ACTIVE' },
      include: {
        opportunity: {
          include: {
            business: true
          }
        }
      }
    });

    for (const investment of investments) {
      await this.checkMilestones(investment);
    }
  }

  /**
   * Get investment recommendations based on portfolio
   */
  async getInvestmentRecommendations(userId: string): Promise<any> {
    const analytics = await this.getPortfolioAnalytics(userId);
    const recommendations = [];

    // Diversification recommendations
    if (analytics.diversificationScore < 60) {
      recommendations.push({
        type: 'DIVERSIFICATION',
        priority: 'HIGH',
        message: 'Consider diversifying your portfolio across different industries to reduce risk',
        action: 'Explore investments in new sectors'
      });
    }

    // Risk balance recommendations
    const highRiskPercentage = (analytics.riskDistribution['HIGH'] || 0) / analytics.totalInvested * 100;
    if (highRiskPercentage > 40) {
      recommendations.push({
        type: 'RISK_BALANCE',
        priority: 'MEDIUM',
        message: 'High-risk investments detected. Consider adding more stable options.',
        action: 'Explore low or medium risk opportunities'
      });
    }

    // Performance recommendations
    if (analytics.overallROI < 10) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'LOW',
        message: 'Your portfolio ROI is below average. Consider reviewing your investment strategy',
        action: 'Analyze underperforming investments'
      });
    }

    return {
      recommendations,
      portfolioHealth: this.calculatePortfolioHealth(analytics)
    };
  }

  /**
   * Calculate current value of investment (simplified)
   */
  private calculateCurrentValue(investment: any): number {
    // In production, this would be based on actual business performance
    // For now, we'll use a simple calculation based on time and expected returns
    const monthsInvested = (Date.now() - investment.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const expectedAnnualReturn = investment.opportunity.expectedReturn || 15; // Default 15%
    const monthlyReturn = expectedAnnualReturn / 12;
    
    const appreciation = investment.amount * (monthlyReturn / 100) * monthsInvested;
    return investment.amount + appreciation;
  }

  /**
   * Get risk level for business
   */
  private getRiskLevel(business: any): string {
    // Simplified risk assessment
    if (business.stage === 'IDEA') return 'HIGH';
    if (business.stage === 'STARTUP') return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(investments: any[]): Array<{ month: string; returns: number }> {
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyData[monthKey] = 0;
    }

    investments.forEach(inv => {
      const monthsInvested = (Date.now() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const expectedAnnualReturn = inv.opportunity.expectedReturn || 15;
      const monthlyReturn = expectedAnnualReturn / 12;
      
      for (let i = 0; i < Math.min(monthsInvested, 6); i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey] += inv.amount * (monthlyReturn / 100);
        }
      }
    });

    return Object.entries(monthlyData).map(([month, returns]) => ({ month, returns }));
  }

  /**
   * Check investment milestones
   */
  private async checkMilestones(investment: any): Promise<void> {
    const daysInvested = (Date.now() - investment.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // 30-day milestone
    if (daysInvested >= 30 && daysInvested < 31) {
      await notificationService.create({
        userId: investment.investorId,
        title: 'Investment Milestone: 30 Days',
        message: `Your investment in ${investment.opportunity.business.name} has been active for 30 days!`,
        type: 'INFO',
        category: 'INVESTMENT',
        sendEmail: true
      });
    }

    // 90-day milestone
    if (daysInvested >= 90 && daysInvested < 91) {
      await notificationService.create({
        userId: investment.investorId,
        title: 'Investment Milestone: 90 Days',
        message: `Your investment in ${investment.opportunity.business.name} has been active for 90 days!`,
        type: 'INFO',
        category: 'INVESTMENT',
        sendEmail: true
      });
    }

    // Maturity reminder
    if (investment.maturityDate) {
      const daysToMaturity = (investment.maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysToMaturity <= 30 && daysToMaturity > 29) {
        await notificationService.create({
          userId: investment.investorId,
          title: 'Investment Maturity Approaching',
          message: `Your investment in ${investment.opportunity.business.name} will mature in 30 days!`,
          type: 'WARNING',
          category: 'INVESTMENT',
          sendEmail: true
        });
      }
    }
  }

  /**
   * Calculate portfolio health score
   */
  private calculatePortfolioHealth(analytics: PortfolioAnalytics): number {
    let healthScore = 100;

    // Diversification impact
    if (analytics.diversificationScore < 40) healthScore -= 20;
    else if (analytics.diversificationScore < 60) healthScore -= 10;

    // Risk balance impact
    const highRiskPercentage = (analytics.riskDistribution['HIGH'] || 0) / analytics.totalInvested * 100;
    if (highRiskPercentage > 60) healthScore -= 20;
    else if (highRiskPercentage > 40) healthScore -= 10;

    // Performance impact
    if (analytics.overallROI < 0) healthScore -= 30;
    else if (analytics.overallROI < 5) healthScore -= 15;
    else if (analytics.overallROI > 20) healthScore += 10;

    return Math.max(0, Math.min(100, healthScore));
  }
}

// Export singleton instance
export const investmentTrackingService = new InvestmentTrackingService();
