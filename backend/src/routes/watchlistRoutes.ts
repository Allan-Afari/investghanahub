/**
 * Watchlist Routes for InvestGhanaHub
 * Handles user watchlists for saving businesses they're interested in
 */

import { Router, Request, Response, NextFunction } from 'express';
import { watchlistService } from '../services/watchlistService';
import { authMiddleware } from '../middleware/authMiddleware';
import Joi from 'joi';

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const addToWatchlistSchema = Joi.object({
  businessId: Joi.string().uuid().required()
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /api/watchlist
 * Add a business to user's watchlist
 */
router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { businessId } = req.body;

      const result = await watchlistService.addToWatchlist({
        userId,
        businessId
      });

      res.status(201).json({
        success: true,
        message: 'Business added to watchlist successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/watchlist/:businessId
 * Remove a business from user's watchlist
 */
router.delete(
  '/:businessId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { businessId } = req.params;

      await watchlistService.removeFromWatchlist(userId, businessId);

      res.status(200).json({
        success: true,
        message: 'Business removed from watchlist successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/watchlist
 * Get user's watchlist with pagination
 */
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await watchlistService.getUserWatchlist(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/watchlist/check/:businessId
 * Check if a business is in user's watchlist
 */
router.get(
  '/check/:businessId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { businessId } = req.params;

      const isWatched = await watchlistService.isBusinessWatched(userId, businessId);

      res.status(200).json({
        success: true,
        data: {
          isWatched,
          businessId
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/watchlist/stats
 * Get watchlist statistics for the user
 */
router.get(
  '/stats',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;

      const stats = await watchlistService.getWatchlistStats(userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
