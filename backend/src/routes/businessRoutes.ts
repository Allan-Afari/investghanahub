/**
 * Business Routes for InvestGhanaHub
 * Handles business registration and management for crops, startups, and operational businesses
 * Enhanced with Joi validation and comprehensive Ghana-specific validations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, body, validationResult } from 'express-validator';
import { businessService } from '../services/businessService';
import { authMiddleware, adminMiddleware, businessOwnerMiddleware } from '../middleware/authMiddleware';
import {
  validate
} from '../middleware/advancedSecurityMiddleware';
import {
  businessValidationSchema,
  opportunityValidationSchema
} from '../middleware/businessValidationSchemas';
import Joi from 'joi';

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const listBusinessesSchema = Joi.object({
  category: Joi.string().valid('crops', 'startup', 'operational').optional(),
  industry: Joi.string().optional(),
  stage: Joi.string().valid('IDEA', 'STARTUP', 'GROWTH', 'ESTABLISHED').optional(),
  region: Joi.string().optional(),
  minInvestment: Joi.number().min(0).optional(),
  maxInvestment: Joi.number().min(0).optional(),
  riskLevel: Joi.string().valid('low', 'medium', 'high').optional(),
  isFeatured: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(10).optional(),
  sortBy: Joi.string().valid('createdAt', 'targetAmount', 'currentAmount').default('createdAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional(),
});

const compareBusinessesSchema = Joi.object({
  businessIds: Joi.array().items(Joi.string().uuid()).min(2).max(5).required().messages({
    'array.min': 'At least 2 businesses required for comparison',
    'array.max': 'Maximum 5 businesses can be compared at once',
    'any.required': 'Business IDs array is required'
  })
});

const featureBusinessSchema = Joi.object({
  duration: Joi.number().integer().min(1).max(365).required().messages({
    'number.min': 'Duration must be at least 1 day',
    'number.max': 'Duration cannot exceed 365 days',
    'any.required': 'Duration is required'
  })
});

const businessRejectSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Rejection reason must be at least 10 characters',
    'string.max': 'Rejection reason must not exceed 500 characters',
    'any.required': 'Rejection reason is required',
  }),
});

// ===========================================
// PUBLIC ROUTES
// ===========================================

/**
 * GET /api/businesses
 * List all approved businesses with enhanced filtering (public)
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        category: req.query.category as string,
        industry: req.query.industry as string,
        stage: req.query.stage as string,
        region: req.query.region as string,
        minInvestment: req.query.minInvestment ? parseInt(req.query.minInvestment as string) : undefined,
        maxInvestment: req.query.maxInvestment ? parseInt(req.query.maxInvestment as string) : undefined,
        riskLevel: req.query.riskLevel as string,
        isFeatured: req.query.isFeatured ? req.query.isFeatured === 'true' : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as 'createdAt' | 'targetAmount' | 'currentAmount' || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const result = await businessService.listApprovedBusinesses(filters);

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
 * GET /api/businesses/:id
 * Get business details (public for approved businesses)
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const business = await businessService.getBusinessById(id);

      res.status(200).json({
        success: true,
        data: business
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/businesses/:id/opportunities
 * Get all investment opportunities for a business
 */
router.get(
  '/:id/opportunities',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const opportunities = await businessService.getBusinessOpportunities(id);

      res.status(200).json({
        success: true,
        data: opportunities
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// BUSINESS OWNER ROUTES
// ===========================================

/**
 * POST /api/businesses
 * Create a new business (business owner only)
 */
router.post(
  '/',
  authMiddleware,
  businessOwnerMiddleware,
  validate(businessValidationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const ownerId = (req as any).user.id;
      const businessData = req.body;

      const result = await businessService.createBusiness(ownerId, businessData);

      res.status(201).json({
        success: true,
        message: 'Business created successfully. Awaiting admin approval.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/businesses/my/list
 * Get business owner's businesses
 */
router.get(
  '/my/list',
  authMiddleware,
  businessOwnerMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = (req as any).user.id;
      const businesses = await businessService.getOwnerBusinesses(ownerId);

      res.status(200).json({
        success: true,
        data: businesses
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/businesses/my/info
 * Get current user's business info (dashboard endpoint)
 */
router.get(
  '/my/info',
  authMiddleware,
  businessOwnerMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = (req as any).user.id;
      const business = await businessService.getOwnerBusinessInfo(ownerId);

      if (!business) {
        res.status(404).json({
          success: false,
          message: 'Business not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: business
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/businesses/my/opportunities
 * Get business owner's investment opportunities (dashboard endpoint)
 */
router.get(
  '/my/opportunities',
  authMiddleware,
  businessOwnerMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = (req as any).user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const opportunities = await businessService.getOwnerOpportunities(ownerId, {
        page,
        limit,
        status
      });

      res.status(200).json({
        success: true,
        data: opportunities
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/businesses/:id
 * Update business (owner only, before approval)
 */
router.put(
  '/:id',
  authMiddleware,
  businessOwnerMiddleware,
  validate(businessValidationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const ownerId = (req as any).user.id;
      const businessData = req.body;

      const result = await businessService.updateBusiness(id, ownerId, businessData);

      res.status(200).json({
        success: true,
        message: 'Business updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/businesses/:id/opportunities
 * Create investment opportunity for a business (owner only)
 */
router.post(
  '/:id/opportunities',
  authMiddleware,
  businessOwnerMiddleware,
  validate(opportunityValidationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const ownerId = (req as any).user.id;
      const opportunityData = req.body;

      const result = await businessService.createOpportunity(id, ownerId, opportunityData);

      res.status(201).json({
        success: true,
        message: 'Investment opportunity created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// ADMIN ROUTES
// ===========================================

/**
 * GET /api/businesses/admin/pending
 * Get all pending businesses (admin only)
 */
router.get(
  '/admin/pending',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pendingBusinesses = await businessService.getPendingBusinesses();

      res.status(200).json({
        success: true,
        data: pendingBusinesses
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/businesses/:id/approve
 * Approve business (admin only)
 */
router.post(
  '/:id/approve',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = (req as any).user.id;

      const result = await businessService.approveBusiness(id, adminId);

      res.status(200).json({
        success: true,
        message: 'Business approved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/businesses/:id/reject
 * Reject business (admin only)
 */
router.post(
  '/:id/reject',
  authMiddleware,
  adminMiddleware,
  [
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Rejection reason is required')
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user.id;

      const result = await businessService.rejectBusiness(id, adminId, reason);

      res.status(200).json({
        success: true,
        message: 'Business rejected',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/businesses/compare
 * Compare multiple businesses side-by-side
 */
router.post(
  '/compare',
  authMiddleware,
  validate(compareBusinessesSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessIds } = req.body;

      const comparison = await businessService.compareBusinesses(businessIds);

      res.status(200).json({
        success: true,
        message: `Comparing ${comparison.comparisonCount} businesses`,
        data: comparison
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/businesses/recommendations
 * Get smart recommendations for investors based on their profile
 */
router.get(
  '/recommendations',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 5;

      const recommendations = await businessService.getRecommendations(userId, limit);

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
 * POST /api/businesses/:id/feature
 * Feature a business (admin only)
 */
router.post(
  '/:id/feature',
  authMiddleware,
  adminMiddleware,
  validate(featureBusinessSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { duration } = req.body;
      const adminId = (req as any).user.id;

      const result = await businessService.featureBusiness(id, adminId, duration);

      res.status(200).json({
        success: true,
        message: `Business featured for ${duration} days`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
