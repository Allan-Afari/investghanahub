/**
 * Profit Distribution Routes for InvestGhanaHub
 * Handles profit tracking and distribution
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { profitDistributionService } from '../services/profitDistributionService';

const router = express.Router();

/**
 * GET /profits/history
 * Get investor's profit distribution history
 * Authorization: Investor
 */
router.get(
  '/history',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      // Only investors can view their profit history
      if (userRole !== 'INVESTOR') {
        return res.status(403).json({ error: 'Only investors can view profit history' });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const result = await profitDistributionService.getProfitHistory(userId, page, limit);

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('Error getting profit history:', error.message);
      return res.status(500).json({ error: 'Failed to get profit history' });
    }
  }
);

/**
 * GET /profits/stats
 * Get investor's profit statistics
 * Authorization: Investor
 */
router.get(
  '/stats',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      // Only investors can view their profit stats
      if (userRole !== 'INVESTOR') {
        return res.status(403).json({ error: 'Only investors can view profit stats' });
      }

      const stats = await profitDistributionService.getProfitStats(userId);

      return res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      console.error('Error getting profit stats:', error.message);
      return res.status(500).json({ error: 'Failed to get profit stats' });
    }
  }
);

/**
 * POST /profits/process
 * Manually trigger profit distribution (Admin only)
 * Authorization: Admin
 */
router.post(
  '/process',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user.role;

      // Only admins can trigger manual processing
      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can trigger profit distribution' });
      }

      const result = await profitDistributionService.processAutomaticDistribution();

      return res.json({
        ...result,
      });
    } catch (error: any) {
      console.error('Error processing profits:', error.message);
      return res.status(500).json({ error: 'Failed to process profits' });
    }
  }
);

/**
 * GET /profits/transfer/:id
 * Get specific profit transfer details
 * Authorization: Related Investor or Admin
 */
router.get(
  '/transfer/:id',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const { id } = req.params;

      // Get profit transfer
      const profitTransfer = await (global as any).prisma.profitTransfer.findUnique({
        where: { id },
        include: {
          investment: true,
          bankAccount: true,
          investor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!profitTransfer) {
        return res.status(404).json({ error: 'Profit transfer not found' });
      }

      // Check authorization
      if (profitTransfer.investorId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to view this transfer' });
      }

      return res.json({
        success: true,
        profitTransfer,
      });
    } catch (error: any) {
      console.error('Error getting profit transfer:', error.message);
      return res.status(500).json({ error: 'Failed to get profit transfer' });
    }
  }
);

export default router;
