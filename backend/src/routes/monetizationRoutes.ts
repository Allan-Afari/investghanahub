/**
 * Monetization Routes for InvestGhanaHub
 * Handles commissions, subscriptions, promotions, and revenue tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { monetizationService } from '../services/monetizationService';
import { authMiddleware, adminMiddleware, businessOwnerMiddleware } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';

const prisma = new PrismaClient();

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const createCommissionSchema = Joi.object({
  investmentId: Joi.string().uuid().required().messages({
    'any.required': 'Investment ID is required',
    'string.uuid': 'Invalid investment ID format'
  }),
  commissionRate: Joi.number().min(0).max(100).required().messages({
    'any.required': 'Commission rate is required',
    'number.min': 'Commission rate cannot be negative',
    'number.max': 'Commission rate cannot exceed 100%'
  }),
  commissionAmount: Joi.number().min(0).required().messages({
    'any.required': 'Commission amount is required',
    'number.min': 'Commission amount cannot be negative'
  }),
  commissionType: Joi.string().valid('PLATFORM_FEE', 'SUCCESS_FEE', 'PREMIUM_FEATURE').required().messages({
    'any.required': 'Commission type is required',
    'any.only': 'Invalid commission type'
  }),
  description: Joi.string().max(500).optional()
});

const createSubscriptionSchema = Joi.object({
  tier: Joi.string().valid('BASIC', 'PREMIUM', 'ENTERPRISE').required().messages({
    'any.required': 'Subscription tier is required',
    'any.only': 'Invalid subscription tier'
  }),
  paymentMethod: Joi.string().required().messages({
    'any.required': 'Payment method is required'
  }),
  duration: Joi.number().integer().min(1).max(12).default(1).messages({
    'number.min': 'Duration must be at least 1 month',
    'number.max': 'Duration cannot exceed 12 months'
  })
});

const createPromotionSchema = Joi.object({
  businessId: Joi.string().uuid().required().messages({
    'any.required': 'Business ID is required',
    'string.uuid': 'Invalid business ID format'
  }),
  promotionType: Joi.string().valid('FEATURED_LISTING', 'SPONSORED_PLACEMENT', 'BANNER_AD').required().messages({
    'any.required': 'Promotion type is required',
    'any.only': 'Invalid promotion type'
  }),
  duration: Joi.number().integer().min(1).max(365).required().messages({
    'any.required': 'Duration is required',
    'number.min': 'Duration must be at least 1 day',
    'number.max': 'Duration cannot exceed 365 days'
  }),
  price: Joi.number().min(0).required().messages({
    'any.required': 'Price is required',
    'number.min': 'Price cannot be negative'
  }),
  description: Joi.string().max(500).optional()
});

const cancelSubscriptionSchema = Joi.object({
  subscriptionId: Joi.string().uuid().required().messages({
    'any.required': 'Subscription ID is required',
    'string.uuid': 'Invalid subscription ID format'
  })
});

// ===========================================
// COMMISSION ROUTES
// ===========================================

/**
 * POST /api/monetization/commissions
 * Create commission record (admin only)
 */
router.post(
  '/commissions',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createCommissionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const result = await monetizationService.createCommission(value);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Commission created successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/monetization/commissions/:commissionId/pay
 * Process commission payment (admin only)
 */
router.put(
  '/commissions/:commissionId/pay',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commissionId } = req.params;
      const result = await monetizationService.processCommissionPayment(commissionId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Commission payment processed successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/monetization/commissions/statistics
 * Get commission statistics (admin only)
 */
router.get(
  '/commissions/statistics',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await monetizationService.getCommissionStatistics();

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// SUBSCRIPTION ROUTES
// ===========================================

/**
 * GET /api/monetization/subscriptions/tiers
 * Get available subscription tiers
 */
router.get(
  '/subscriptions/tiers',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tiers = monetizationService.getSubscriptionTiers();

      res.status(200).json({
        success: true,
        data: tiers
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/monetization/subscriptions
 * Create subscription
 */
router.post(
  '/subscriptions',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createSubscriptionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await monetizationService.createSubscription({
        ...value,
        userId
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Subscription created successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/monetization/subscriptions/current
 * Get user's current subscription
 */
router.get(
  '/subscriptions/current',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await monetizationService.getUserSubscription(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/monetization/subscriptions/cancel
 * Cancel subscription
 */
router.put(
  '/subscriptions/cancel',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = cancelSubscriptionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await monetizationService.cancelSubscription(userId, value.subscriptionId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Subscription cancelled successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/monetization/subscriptions/statistics
 * Get subscription statistics (admin only)
 */
router.get(
  '/subscriptions/statistics',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await monetizationService.getSubscriptionStatistics();

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// PROMOTION ROUTES
// ===========================================

/**
 * POST /api/monetization/promotions
 * Create promotion for business
 */
router.post(
  '/promotions',
  authMiddleware,
  businessOwnerMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createPromotionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await monetizationService.createPromotion(value, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Promotion created successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/monetization/promotions/business/:businessId
 * Get promotions for a business
 */
router.get(
  '/promotions/business/:businessId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;
      
      // Verify user owns the business or is admin
      const business = await prisma.business.findUnique({
        where: { id: businessId },
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

      const result = await monetizationService.getBusinessPromotions(businessId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// LIMITS AND ACCESS CONTROL
// ===========================================

/**
 * POST /api/monetization/check-limits
 * Check if user can perform action based on subscription limits
 */
router.post(
  '/check-limits',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { action, currentCount } = req.body;

      if (!action) {
        res.status(400).json({
          success: false,
          message: 'Action is required'
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await monetizationService.checkUserLimits(userId, action, currentCount);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/monetization/revenue/overview
 * Get revenue overview (admin only)
 */
router.get(
  '/revenue/overview',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [commissionStats, subscriptionStats] = await Promise.all([
        monetizationService.getCommissionStatistics(),
        monetizationService.getSubscriptionStatistics()
      ]);

      const overview = {
        totalRevenue: (commissionStats.data?.overview.totalAmount || 0) + (subscriptionStats.data?.monthlyRevenue.reduce((sum: number, item: any) => sum + item.revenue, 0) || 0),
        commissions: commissionStats.data,
        subscriptions: subscriptionStats.data,
        revenueStreams: {
          commissions: commissionStats.data?.overview.totalAmount || 0,
          subscriptions: subscriptionStats.data?.monthlyRevenue.reduce((sum: number, item: any) => sum + item.revenue, 0) || 0
        }
      };

      res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
