import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { disputeService } from '../services/disputeService';

const router = Router();

// All dispute routes require authentication
router.use(authMiddleware);

router.post(
  '/',
  [
    body('paymentReference').optional().isString(),
    body('escrowId').optional().isUUID(),
    body('reason').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const userId = (req as any).user.id;
      const { paymentReference, escrowId, reason } = req.body;

      const dispute = await disputeService.createDispute(userId, {
        paymentReference,
        escrowId,
        reason,
      });

      res.status(201).json({
        success: true,
        message: 'Dispute created',
        data: dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/my',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const disputes = await disputeService.listMyDisputes(userId);
      res.status(200).json({ success: true, data: disputes });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const isAdmin = (req as any).user.role === 'ADMIN';
      const dispute = await disputeService.getDisputeById(userId, req.params.id, isAdmin);
      res.status(200).json({ success: true, data: dispute });
    } catch (error) {
      next(error);
    }
  }
);

// Admin endpoints
router.get(
  '/',
  adminMiddleware,
  [query('status').optional().isString()],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.query;
      const disputes = await disputeService.listAllDisputes({ status: status as string | undefined });
      res.status(200).json({ success: true, data: disputes });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/resolve',
  adminMiddleware,
  [
    body('resolution').isIn(['REFUND', 'RELEASE', 'REJECTED']),
    body('resolutionNotes').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const adminId = (req as any).user.id;
      const { resolution, resolutionNotes } = req.body;

      const dispute = await disputeService.resolveDispute(
        adminId,
        req.params.id,
        resolution,
        resolutionNotes
      );

      res.status(200).json({
        success: true,
        message: 'Dispute resolved',
        data: dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
