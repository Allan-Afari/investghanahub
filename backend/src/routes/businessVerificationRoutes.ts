import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { businessVerificationService } from '../services/businessVerificationService';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all business verification routes
router.use(authMiddleware);

/**
 * POST /api/business-verification/submit
 * Submit business verification request
 */
router.post(
  '/submit',
  [
    body('businessId').notEmpty().withMessage('Business ID is required'),
    body('documents').isObject().withMessage('Documents object is required'),
    body('additionalInfo').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: errors.array(),
        });
      }

      const { businessId, documents, additionalInfo } = req.body;
      const userId = (req as any).user.id;

      const result = await businessVerificationService.createVerificationRequest(
        {
          businessId,
          documents,
          additionalInfo,
        },
        userId
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Verification request submitted successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to submit verification request',
        });
      }
    } catch (error: any) {
      console.error('Submit verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit verification request',
      });
    }
  }
);

/**
 * POST /api/business-verification/update-status
 * Update verification status (Admin only)
 */
router.post(
  '/update-status',
  [
    body('verificationId').notEmpty().withMessage('Verification ID is required'),
    body('status').isIn(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_ADDITIONAL_INFO']).withMessage('Invalid status'),
    body('reviewNotes').optional().isString(),
    body('additionalDocumentsRequested').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: errors.array(),
        });
      }

      const { verificationId, status, reviewNotes, additionalDocumentsRequested } = req.body;
      const userId = (req as any).user.id;

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const adminId = user.id;

      const params = {
        verificationId,
        status,
        reviewedBy: adminId,
        reviewNotes,
        additionalDocumentsRequested,
      };

      const result = await businessVerificationService.updateVerificationStatus(params, adminId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Verification status updated successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to update verification status',
        });
      }
    } catch (error: any) {
      console.error('Update verification status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update verification status',
      });
    }
  }
);

/**
 * GET /api/business-verification/:verificationId
 * Get verification details
 */
router.get(
  '/:verificationId',
  async (req: Request, res: Response) => {
    try {
      const { verificationId } = req.params;
      const userId = (req as any).user.id;

      const result = await businessVerificationService.getVerificationDetails(verificationId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Verification details retrieved successfully',
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message || 'Verification not found',
        });
      }
    } catch (error: any) {
      console.error('Get verification details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification details',
      });
    }
  }
);

/**
 * GET /api/business-verification
 * Get all verification requests (Admin only)
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 20, status } = req.query;

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const result = await businessVerificationService.getAllVerifications(
        Number(page),
        Number(limit),
        status as string
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Verification requests retrieved successfully',
          data: result.data,
          pagination: result.pagination,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to get verification requests',
        });
      }
    } catch (error: any) {
      console.error('Get all verifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification requests',
      });
    }
  }
);

/**
 * GET /api/business-verification/checklist
 * Get verification checklist for business owners
 */
router.get(
  '/checklist',
  async (req: Request, res: Response) => {
    try {
      const result = await businessVerificationService.getVerificationChecklist();

      res.status(200).json({
        success: true,
        message: 'Verification checklist retrieved successfully',
        data: result.data,
      });
    } catch (error: any) {
      console.error('Get verification checklist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification checklist',
      });
    }
  }
);

export default router;
