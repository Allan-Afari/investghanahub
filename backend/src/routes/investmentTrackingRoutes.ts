/**
 * Investment Tracking Routes for InvestGhanaHub
 * Handles investment portfolio tracking, analytics, and performance monitoring
 */

import { Router, Request, Response, NextFunction } from 'express';
import { investmentTrackingService } from '../services/investmentTrackingService';
import { authMiddleware } from '../middleware/authMiddleware';
import Joi from 'joi';

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20).optional(),
});

// ===========================================
// INVESTOR ROUTES
// ===========================================

/**
 * GET /api/investments/metrics
 * Get user's investment metrics
 */
router.get(
  '/metrics',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const metrics = await investmentTrackingService.getUserInvestmentMetrics(userId);

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
 * GET /api/investments/performance
 * Get detailed investment performance
 */
router.get(
  '/performance',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
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
 * GET /api/investments/analytics
 * Get comprehensive portfolio analytics
 */
router.get(
  '/analytics',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
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
 * GET /api/investments/recommendations
 * Get investment recommendations based on portfolio
 */
router.get(
  '/recommendations',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
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
 * POST /api/investments/track-milestones
 * Track investment milestones (admin/cron job endpoint)
 */
router.post(
  '/track-milestones',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await investmentTrackingService.trackInvestmentMilestones();

      res.status(200).json({
        success: true,
        message: 'Investment milestones tracked successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
