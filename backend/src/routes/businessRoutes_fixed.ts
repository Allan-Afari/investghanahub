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
  region: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(10).optional(),
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
 * List all approved businesses (public)
 */
router.get(
  '/',
  [
    query('category')
      .optional()
      .isIn(['crops', 'startup', 'operational']),
    query('region')
      .optional()
      .isString(),
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, region, page = '1', limit = '10' } = req.query;

      const result = await businessService.listApprovedBusinesses({
        category: category as string,
        region: region as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

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

export default router;
