/**
 * Analytics Routes for InvestGhanaHub
 * Handles platform analytics, dashboards, and reporting
 */

import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';

const prisma = new PrismaClient();

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const businessAnalyticsSchema = Joi.object({
  businessId: Joi.string().uuid().required().messages({
    'any.required': 'Business ID is required',
    'string.uuid': 'Invalid business ID format'
  })
});

const dateRangeSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month').optional()
});

// ===========================================
// ANALYTICS ROUTES
// ===========================================

/**
 * GET /api/analytics/platform
 * Get comprehensive platform metrics (admin only)
 */
router.get(
  '/platform',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await analyticsService.getPlatformMetrics();

      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/admin
 * Get comprehensive admin analytics dashboard (admin only)
 */
router.get(
  '/admin',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analytics = await analyticsService.getAdminAnalytics();

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/business/:businessId
 * Get business-specific analytics (business owner only)
 */
router.get(
  '/business/:businessId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = businessAnalyticsSchema.validate({ businessId: req.params.businessId });
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      
      // Verify user owns the business or is admin
      const business = await prisma.business.findUnique({
        where: { id: value.businessId },
        select: { ownerId: true }
      });

      if (!business) {
        res.status(404).json({
          success: false,
          message: 'Business not found'
        });
        return;
      }

      const userRole = (req as any).user.role;
      if (business.ownerId !== userId && userRole !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const analytics = await analyticsService.getBusinessAnalytics(value.businessId);

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/investor/portfolio
 * Get investor portfolio analytics
 */
router.get(
  '/investor/portfolio',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      if (userRole !== 'INVESTOR') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Investor role required.'
        });
        return;
      }

      // Use investment tracking service for portfolio analytics
      const { investmentTrackingService } = await import('../services/investmentTrackingService');
      const analytics = await investmentTrackingService.getPortfolioAnalytics(userId);

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/investor/performance
 * Get investor performance metrics
 */
router.get(
  '/investor/performance',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      if (userRole !== 'INVESTOR') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Investor role required.'
        });
        return;
      }

      const { investmentTrackingService } = await import('../services/investmentTrackingService');
      const performance = await investmentTrackingService.getInvestmentPerformance(userId);

      res.status(200).json({
        success: true,
        data: performance
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/investor/recommendations
 * Get investment recommendations based on portfolio
 */
router.get(
  '/investor/recommendations',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      if (userRole !== 'INVESTOR') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Investor role required.'
        });
        return;
      }

      const { investmentTrackingService } = await import('../services/investmentTrackingService');
      const recommendations = await investmentTrackingService.getInvestmentRecommendations(userId);

      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/reports/summary
 * Get platform summary report (admin only)
 */
router.get(
  '/reports/summary',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = dateRangeSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const [platformMetrics, adminAnalytics] = await Promise.all([
        analyticsService.getPlatformMetrics(),
        analyticsService.getAdminAnalytics()
      ]);

      const summary = {
        overview: {
          totalUsers: platformMetrics.totalUsers,
          totalBusinesses: platformMetrics.totalBusinesses,
          totalInvestments: platformMetrics.totalInvestments,
          totalInvestmentAmount: platformMetrics.totalInvestmentAmount,
          activeInvestments: platformMetrics.activeInvestments
        },
        growth: adminAnalytics.platformHealth,
        financials: adminAnalytics.financialMetrics,
        topMetrics: {
          averageInvestmentSize: platformMetrics.averageInvestmentSize,
          topIndustries: platformMetrics.topIndustries.slice(0, 5),
          monthlyGrowth: platformMetrics.monthlyGrowth.slice(-3)
        }
      };

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/reports/business-performance
 * Get business performance report (admin only)
 */
router.get(
  '/reports/business-performance',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const businessMetrics = await analyticsService.getBusinessMetrics();

      const report = {
        summary: {
          totalBusinesses: businessMetrics.totalBusinesses,
          approvedBusinesses: businessMetrics.approvedBusinesses,
          pendingBusinesses: businessMetrics.pendingBusinesses,
          averageFundingGoal: businessMetrics.averageFundingGoal,
          totalFundingRaised: businessMetrics.totalFundingRaised
        },
        distribution: {
          byIndustry: businessMetrics.businessesByIndustry,
          byStage: businessMetrics.businessesByStage
        },
        performance: {
          approvalRate: businessMetrics.totalBusinesses > 0 
            ? (businessMetrics.approvedBusinesses / businessMetrics.totalBusinesses) * 100 
            : 0,
          averageFundingProgress: businessMetrics.totalBusinesses > 0
            ? (businessMetrics.totalFundingRaised / businessMetrics.totalBusinesses) / businessMetrics.averageFundingGoal * 100
            : 0
        }
      };

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/reports/user-activity
 * Get user activity report (admin only)
 */
router.get(
  '/reports/user-activity',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userMetrics = await analyticsService.getUserMetrics();

      const report = {
        overview: {
          totalUsers: userMetrics.totalUsers,
          verifiedUsers: userMetrics.verifiedUsers,
          premiumUsers: userMetrics.premiumUsers,
          activeUsers: userMetrics.activeUsers
        },
        distribution: {
          byRole: userMetrics.userByRole,
          byRegion: userMetrics.userByRegion
        },
        engagement: {
          verificationRate: userMetrics.totalUsers > 0 
            ? (userMetrics.verifiedUsers / userMetrics.totalUsers) * 100 
            : 0,
          premiumConversionRate: userMetrics.totalUsers > 0
            ? (userMetrics.premiumUsers / userMetrics.totalUsers) * 100
            : 0,
          activeUserRate: userMetrics.totalUsers > 0
            ? (userMetrics.activeUsers / userMetrics.totalUsers) * 100
            : 0
        }
      };

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/reports/financial-summary
 * Get financial summary report (admin only)
 */
router.get(
  '/reports/financial-summary',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const financialMetrics = await analyticsService.getFinancialMetrics();

      const report = {
        overview: {
          platformRevenue: financialMetrics.platformRevenue,
          commissionRevenue: financialMetrics.commissionRevenue,
          premiumRevenue: financialMetrics.premiumRevenue,
          transactionFees: financialMetrics.transactionFees
        },
        revenueBreakdown: {
          commissionPercentage: financialMetrics.platformRevenue > 0
            ? (financialMetrics.commissionRevenue / financialMetrics.platformRevenue) * 100
            : 0,
          premiumPercentage: financialMetrics.platformRevenue > 0
            ? (financialMetrics.premiumRevenue / financialMetrics.platformRevenue) * 100
            : 0,
          transactionPercentage: financialMetrics.platformRevenue > 0
            ? (financialMetrics.transactionFees / financialMetrics.platformRevenue) * 100
            : 0
        },
        trends: {
          monthlyRevenue: financialMetrics?.monthlyRevenue || [],
          revenueGrowth: financialMetrics?.monthlyRevenue ? calculateRevenueGrowth(financialMetrics.monthlyRevenue) : 0
        }
      };

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/health
 * Get platform health metrics (admin only)
 */
router.get(
  '/health',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminAnalytics = await analyticsService.getAdminAnalytics();
      const health = adminAnalytics.platformHealth;

      // Calculate overall health score
      const healthScore = health ? calculateOverallHealthScore(health) : 0;

      res.status(200).json({
        success: true,
        data: {
          ...health,
          overallScore: healthScore,
          status: healthScore ? getHealthStatus(healthScore) : 'UNKNOWN',
          recommendations: health ? getHealthRecommendations(health) : []
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper functions for analytics routes
function calculateRevenueGrowth(monthlyRevenue: Array<{ month: string; revenue: number }>): number {
  if (monthlyRevenue.length < 2) return 0;
  
  const latest = monthlyRevenue[monthlyRevenue.length - 1].revenue;
  const previous = monthlyRevenue[monthlyRevenue.length - 2].revenue;
  
  return previous > 0 ? ((latest - previous) / previous) * 100 : 0;
}

function calculateOverallHealthScore(health: any): number {
  let score = 100;
  
  // User growth impact
  if (health.userGrowthRate < 0) score -= 30;
  else if (health.userGrowthRate < 5) score -= 15;
  
  // Business growth impact
  if (health.businessGrowthRate < 0) score -= 25;
  else if (health.businessGrowthRate < 5) score -= 10;
  
  // Investment growth impact
  if (health.investmentGrowthRate < 0) score -= 25;
  else if (health.investmentGrowthRate < 5) score -= 10;
  
  // Revenue growth impact
  if (health.revenueGrowthRate < 0) score -= 20;
  else if (health.revenueGrowthRate < 5) score -= 5;
  
  return Math.max(0, Math.min(100, score));
}

function getHealthStatus(score: number): string {
  if (score >= 80) return 'EXCELLENT';
  if (score >= 60) return 'GOOD';
  if (score >= 40) return 'FAIR';
  return 'POOR';
}

function getHealthRecommendations(health: any): string[] {
  const recommendations = [];
  
  if (health.userGrowthRate < 5) {
    recommendations.push('Consider user acquisition campaigns to boost user growth');
  }
  
  if (health.businessGrowthRate < 5) {
    recommendations.push('Focus on business outreach and onboarding programs');
  }
  
  if (health.investmentGrowthRate < 5) {
    recommendations.push('Enhance investor education and trust-building initiatives');
  }
  
  if (health.revenueGrowthRate < 5) {
    recommendations.push('Review pricing strategy and explore new revenue streams');
  }
  
  return recommendations;
}

export default router;
