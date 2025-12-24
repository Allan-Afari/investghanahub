import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { escrowService } from '../services/escrowService';
import { body, validationResult } from 'express-validator';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createEscrowSchema = Joi.object({
  investmentId: Joi.string().required(),
  amount: Joi.number().min(1).required(),
  conditions: Joi.array().items(Joi.string()).optional(),
  releaseOn: Joi.date().optional(),
});

const releaseEscrowSchema = Joi.object({
  escrowId: Joi.string().required(),
  reason: Joi.string().required(),
  documents: Joi.array().items(Joi.string()).optional(),
});

const refundEscrowSchema = Joi.object({
  escrowId: Joi.string().required(),
  reason: Joi.string().required(),
  refundAmount: Joi.number().min(0).optional(),
});

// Apply auth middleware to all escrow routes
router.use(authMiddleware);

/**
 * POST /api/escrow/create
 * Create escrow for investment
 */
router.post(
  '/create',
  [
    body('investmentId').notEmpty().withMessage('Investment ID is required'),
    body('amount').isNumeric().withMessage('Amount must be numeric'),
    body('conditions').optional().isArray(),
    body('releaseOn').optional().isISO8601().toDate(),
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

      const { investmentId, amount, conditions, releaseOn } = req.body;
      const userId = (req as any).user.id;

      // Get investment details to verify ownership
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
        include: {
          opportunity: {
            include: {
              business: true
            }
          }
        },
      });

      if (!investment) {
        return res.status(404).json({
          success: false,
          message: 'Investment not found',
        });
      }

      // Verify user is investor or business owner
      if (investment.investorId !== userId && investment.opportunity.business.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create escrow for this investment',
        });
      }

      const result = await escrowService.createEscrow({
        investmentId,
        investorId: userId,
        businessId: investment.opportunity.businessId,
        amount,
        conditions,
        releaseOn,
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Escrow created successfully',
          data: {
            escrow: result.data,
            paymentUrl: result.paymentUrl,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to create escrow',
        });
      }
    } catch (error: any) {
      console.error('Create escrow error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create escrow',
      });
    }
  }
);

/**
 * POST /api/escrow/confirm-payment
 * Confirm escrow payment after investor completes payment
 */
router.post(
  '/confirm-payment',
  [
    body('escrowId').notEmpty().withMessage('Escrow ID is required'),
    body('paymentReference').notEmpty().withMessage('Payment reference is required'),
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

      const { escrowId, paymentReference } = req.body;

      const result = await escrowService.confirmEscrowPayment(escrowId, paymentReference);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Escrow payment confirmed successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to confirm escrow payment',
        });
      }
    } catch (error: any) {
      console.error('Confirm escrow payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm escrow payment',
      });
    }
  }
);

/**
 * POST /api/escrow/release
 * Release funds from escrow (Admin only)
 */
router.post(
  '/release',
  [
    body('escrowId').notEmpty().withMessage('Escrow ID is required'),
    body('reason').notEmpty().withMessage('Release reason is required'),
    body('documents').optional().isArray(),
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

      const { escrowId, reason, documents } = req.body;
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

      const result = await escrowService.releaseEscrow({
        escrowId,
        releasedBy: userId,
        reason,
        documents,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Escrow released successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to release escrow',
        });
      }
    } catch (error: any) {
      console.error('Release escrow error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to release escrow',
      });
    }
  }
);

/**
 * POST /api/escrow/refund
 * Refund escrow funds (Admin only)
 */
router.post(
  '/refund',
  [
    body('escrowId').notEmpty().withMessage('Escrow ID is required'),
    body('reason').notEmpty().withMessage('Refund reason is required'),
    body('refundAmount').optional().isNumeric(),
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

      const { escrowId, reason, refundAmount } = req.body;
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

      const result = await escrowService.refundEscrow({
        escrowId,
        refundedBy: userId,
        reason,
        refundAmount,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Escrow refunded successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to refund escrow',
        });
      }
    } catch (error: any) {
      console.error('Refund escrow error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refund escrow',
      });
    }
  }
);

/**
 * GET /api/escrow/:escrowId
 * Get escrow details
 */
router.get(
  '/:escrowId',
  async (req: Request, res: Response) => {
    try {
      const { escrowId } = req.params;
      const userId = (req as any).user.id;

      const result = await escrowService.getEscrowDetails(escrowId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Escrow details retrieved successfully',
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message || 'Escrow not found',
        });
      }
    } catch (error: any) {
      console.error('Get escrow details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get escrow details',
      });
    }
  }
);

/**
 * GET /api/escrow
 * Get user's escrow transactions
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 20 } = req.query;

      const escrows = await prisma.escrow.findMany({
        where: {
          OR: [
            { investorId: userId },
            { businessId: userId },
          ],
        },
        include: {
          investment: {
            include: {
              opportunity: {
                select: { title: true }
              }
            }
          },
          investor: {
            select: { firstName: true, lastName: true, email: true },
          },
          business: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      });

      const total = await prisma.escrow.count({
        where: {
          OR: [
            { investorId: userId },
            { businessId: userId },
          ],
        },
      });

      res.status(200).json({
        success: true,
        message: 'Escrow transactions retrieved successfully',
        data: escrows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Get escrows error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get escrow transactions',
      });
    }
  }
);

export default router;
