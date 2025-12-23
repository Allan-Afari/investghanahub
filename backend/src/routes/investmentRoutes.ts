/**
 * Investment Routes for InvestGhanaHub
 * Handles investment operations and portfolio management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { investmentService } from '../services/investmentService';
import { authMiddleware } from '../middleware/authMiddleware';
import { fraudDetectionMiddleware } from '../middleware/fraudDetectionMiddleware';

const router = Router();

// ===========================================
// VALIDATION RULES
// ===========================================

const investmentValidation = [
  body('opportunityId')
    .trim()
    .notEmpty()
    .withMessage('Investment opportunity ID is required')
    .isUUID()
    .withMessage('Invalid opportunity ID format'),
  body('amount')
    .isFloat({ min: 50 })
    .withMessage('Investment amount must be at least 50 GHS')
];

// ===========================================
// PUBLIC ROUTES
// ===========================================

/**
 * GET /api/investments/opportunities
 * List all open investment opportunities (public)
 */
router.get(
  '/opportunities',
  [
    query('category')
      .optional()
      .isIn(['crops', 'startup', 'operational']),
    query('riskLevel')
      .optional()
      .isIn(['low', 'medium', 'high']),
    query('minAmount')
      .optional()
      .isFloat({ min: 0 }),
    query('maxAmount')
      .optional()
      .isFloat({ min: 0 }),
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        category,
        riskLevel,
        minAmount,
        maxAmount,
        page = '1',
        limit = '10'
      } = req.query;

      const result = await investmentService.listOpportunities({
        category: category as string,
        riskLevel: riskLevel as string,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
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
 * GET /api/investments/opportunities/:id
 * Get investment opportunity details
 */
router.get(
  '/opportunities/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const opportunity = await investmentService.getOpportunityById(id);

      res.status(200).json({
        success: true,
        data: opportunity
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// INVESTOR ROUTES (Protected)
// ===========================================

/**
 * POST /api/investments/invest
 * Make an investment (investor only, KYC required)
 * Uses fraud detection middleware
 */
router.post(
  '/invest',
  authMiddleware,
  fraudDetectionMiddleware,
  investmentValidation,
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

      const investorId = (req as any).user.id;
      const { opportunityId, amount } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await investmentService.makeInvestment(
        investorId,
        opportunityId,
        amount,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Investment successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/investments/portfolio
 * Get investor's portfolio
 */
router.get(
  '/portfolio',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const investorId = (req as any).user.id;
      const portfolio = await investmentService.getPortfolio(investorId);

      res.status(200).json({
        success: true,
        data: portfolio
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/investments/history
 * Get investor's investment history
 */
router.get(
  '/history',
  authMiddleware,
  [
    query('status')
      .optional()
      .isIn(['ACTIVE', 'MATURED', 'WITHDRAWN']),
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const investorId = (req as any).user.id;
      const { status, page = '1', limit = '10' } = req.query;

      const result = await investmentService.getInvestmentHistory(investorId, {
        status: status as string,
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
 * GET /api/investments/:id
 * Get specific investment details
 */
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const investorId = (req as any).user.id;

      const investment = await investmentService.getInvestmentById(id, investorId);

      res.status(200).json({
        success: true,
        data: investment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/investments/transactions/list
 * Get investor's transactions
 */
router.get(
  '/transactions/list',
  authMiddleware,
  [
    query('type')
      .optional()
      .isIn(['INVESTMENT', 'WITHDRAWAL', 'REFUND']),
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const investorId = (req as any).user.id;
      const { type, page = '1', limit = '10' } = req.query;

      const result = await investmentService.getTransactions(investorId, {
        type: type as string,
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
 * GET /api/investments/stats/summary
 * Get investment statistics for the investor
 */
router.get(
  '/stats/summary',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const investorId = (req as any).user.id;
      const stats = await investmentService.getInvestorStats(investorId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/investments/my-investments
 * Get all investments for the logged-in investor (dashboard endpoint)
 */
router.get(
  '/my-investments',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const investorId = (req as any).user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const investments = await investmentService.getInvestorInvestments(investorId, {
        page,
        limit,
        status
      });

      res.status(200).json({
        success: true,
        data: investments
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/investments/portfolio
 * Get portfolio summary for the investor (dashboard endpoint)
 */
router.get(
  '/portfolio',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const investorId = (req as any).user.id;
      const portfolio = await investmentService.getPortfolioSummary(investorId);

      res.status(200).json({
        success: true,
        data: portfolio
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

