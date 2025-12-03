/**
 * KYC Routes for InvestGhanaHub
 * Handles Know Your Customer verification for Ghana compliance
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { kycService } from '../services/kycService';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();

// ===========================================
// VALIDATION RULES
// ===========================================

const kycSubmitValidation = [
  body('ghanaCardNumber')
    .trim()
    .notEmpty()
    .withMessage('Ghana Card number is required')
    .matches(/^GHA-\d{9}-\d$/)
    .withMessage('Invalid Ghana Card format. Use GHA-XXXXXXXXX-X'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Valid date of birth is required (YYYY-MM-DD)')
    .custom((value) => {
      const birthDate = new Date(value);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        throw new Error('You must be at least 18 years old');
      }
      return true;
    }),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 200 })
    .withMessage('Address must be less than 200 characters'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('region')
    .trim()
    .notEmpty()
    .withMessage('Region is required')
    .isIn([
      'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
      'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
      'Bono East', 'Ahafo', 'Western North', 'Oti', 'North East', 'Savannah'
    ])
    .withMessage('Invalid Ghana region'),
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation must be less than 100 characters'),
  body('sourceOfFunds')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Source of funds must be less than 200 characters')
];

// ===========================================
// USER ROUTES
// ===========================================

/**
 * POST /api/kyc/submit
 * Submit KYC information for verification
 */
router.post(
  '/submit',
  authMiddleware,
  kycSubmitValidation,
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
 */
router.put(
  '/update',
  authMiddleware,
  kycSubmitValidation,
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

      const userId = (req as any).user.id;
      const kycData = req.body;

      const result = await kycService.updateKYC(userId, kycData);

      res.status(200).json({
        success: true,
        message: 'KYC updated successfully',
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
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters')
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

      const result = await kycService.rejectKYC(id, adminId, reason);

      res.status(200).json({
        success: true,
        message: 'KYC rejected',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

