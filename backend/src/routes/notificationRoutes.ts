/**
 * Notification Routes for InvestGhanaHub
 * Handles in-app notifications
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, param } from 'express-validator';
import { notificationService } from '../services/notificationService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('unreadOnly').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { page = '1', limit = '20', unreadOnly = 'false' } = req.query;

      const result = await notificationService.getUserNotifications(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        unreadOnly === 'true'
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post(
  '/:id/read',
  [param('id').isUUID()],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      await notificationService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post(
  '/read-all',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;

      await notificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      await notificationService.delete(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

