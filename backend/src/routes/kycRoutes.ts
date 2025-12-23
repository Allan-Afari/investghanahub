/**
 * KYC Routes for InvestGhanaHub
 * Handles Know Your Customer verification for Ghana compliance
 */

import { Router, Request, Response, NextFunction } from 'express';
import { kycService } from '../services/kycService';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import {
  validate,
  kycValidationSchema
} from '../middleware/advancedSecurityMiddleware';
import Joi from 'joi';

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const kycRejectSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Rejection reason must be at least 10 characters',
    'string.max': 'Rejection reason must not exceed 500 characters',
    'any.required': 'Rejection reason is required',
  }),
});

// ===========================================
// USER ROUTES
// ===========================================

/**
 * POST /api/kyc/submit
 * Submit KYC information for verification
 * Enhanced with comprehensive Ghana-specific validation
 */
router.post(
  '/submit',
  authMiddleware,
  validate(kycValidationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const kycData = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await kycService.submitKYC(userId, kycData, ipAddress);

      res.status(201).json({
        success: true,
        message: 'KYC submitted successfully. Awaiting admin approval.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/kyc/status
 * Get current user's KYC status
 */
router.get(
  '/status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const status = await kycService.getKYCStatus(userId);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/kyc/update
 * Update KYC information (only if status is REJECTED or PENDING)
 * Enhanced with comprehensive validation
 */
router.put(
  '/update',
  authMiddleware,
  validate(kycValidationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const kycData = req.body;

      const result = await kycService.updateKYC(userId, kycData);

      res.status(200).json({
        success: true,
        message: 'KYC updated successfully. Awaiting admin review.',
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
 * GET /api/kyc/pending
 * Get all pending KYC submissions (admin only)
 */
router.get(
  '/pending',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pendingKYCs = await kycService.getPendingKYCs();

      res.status(200).json({
        success: true,
        data: pendingKYCs
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/kyc/:id
 * Get specific KYC details (admin only)
 */
router.get(
  '/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const kyc = await kycService.getKYCById(id);

      res.status(200).json({
        success: true,
        data: kyc
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/kyc/:id/approve
 * Approve KYC submission (admin only)
 */
router.post(
  '/:id/approve',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = (req as any).user.id;

      const result = await kycService.approveKYC(id, adminId);

      res.status(200).json({
        success: true,
        message: 'KYC approved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/kyc/:id/reject
 * Reject KYC submission (admin only)
 * Enhanced with validation
 */
router.post(
  '/:id/reject',
  authMiddleware,
  adminMiddleware,
  validate(kycRejectSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user.id;

      const result = await kycService.rejectKYC(id, adminId, reason);

      res.status(200).json({
        success: true,
        message: 'KYC rejected. User will be notified.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

