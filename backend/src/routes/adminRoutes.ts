/**
 * Admin Routes for InvestGhanaHub
 * Handles admin dashboard, fraud detection, and audit logs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { adminService } from '../services/adminService';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// ===========================================
// DASHBOARD ROUTES
// ===========================================

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
router.get(
  '/dashboard',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await adminService.getDashboardStats();

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
 * GET /api/admin/users
 * List all users with filters
 */
router.get(
  '/users',
  [
    query('role')
      .optional()
      .isIn(['INVESTOR', 'BUSINESS_OWNER', 'ADMIN']),
    query('isActive')
      .optional()
      .isBoolean(),
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role, isActive, page = '1', limit = '20' } = req.query;

      const result = await adminService.listUsers({
        role: role as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
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
 * GET /api/admin/users/:id
 * Get user details
 */
router.get(
  '/users/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await adminService.getUserDetails(id);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate user
 */
router.patch(
  '/users/:id/status',
  [
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean')
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
      const { isActive } = req.body;
      const adminId = (req as any).user.id;

      const result = await adminService.updateUserStatus(id, isActive, adminId);

      res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// FRAUD ALERT ROUTES
// ===========================================

/**
 * GET /api/admin/fraud-alerts
 * List all fraud alerts
 */
router.get(
  '/fraud-alerts',
  [
    query('status')
      .optional()
      .isIn(['PENDING', 'RESOLVED', 'DISMISSED']),
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, page = '1', limit = '20' } = req.query;

      const result = await adminService.listFraudAlerts({
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
 * GET /api/admin/fraud-alerts/:id
 * Get fraud alert details
 */
router.get(
  '/fraud-alerts/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = await adminService.getFraudAlertDetails(id);

      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/fraud-alerts/:id/resolve
 * Resolve a fraud alert
 */
router.post(
  '/fraud-alerts/:id/resolve',
  [
    body('notes')
      .trim()
      .notEmpty()
      .withMessage('Resolution notes are required')
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    body('action')
      .isIn(['RESOLVED', 'DISMISSED'])
      .withMessage('Action must be RESOLVED or DISMISSED')
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
      const { notes, action } = req.body;
      const adminId = (req as any).user.id;

      const result = await adminService.resolveFraudAlert(id, adminId, notes, action);

      res.status(200).json({
        success: true,
        message: `Fraud alert ${action.toLowerCase()}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// AUDIT LOG ROUTES
// ===========================================

/**
 * GET /api/admin/audit-logs
 * List audit logs with filters
 */
router.get(
  '/audit-logs',
  [
    query('userId')
      .optional()
      .isUUID(),
    query('action')
      .optional()
      .isString(),
    query('entity')
      .optional()
      .isString(),
    query('startDate')
      .optional()
      .isISO8601(),
    query('endDate')
      .optional()
      .isISO8601(),
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        userId,
        action,
        entity,
        startDate,
        endDate,
        page = '1',
        limit = '50'
      } = req.query;

      const result = await adminService.listAuditLogs({
        userId: userId as string,
        action: action as string,
        entity: entity as string,
        startDate: startDate as string,
        endDate: endDate as string,
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
 * GET /api/admin/audit-logs/:id
 * Get specific audit log details
 */
router.get(
  '/audit-logs/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const log = await adminService.getAuditLogDetails(id);

      res.status(200).json({
        success: true,
        data: log
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// REPORTS ROUTES
// ===========================================

/**
 * GET /api/admin/reports/investments
 * Get investment reports
 */
router.get(
  '/reports/investments',
  [
    query('startDate')
      .optional()
      .isISO8601(),
    query('endDate')
      .optional()
      .isISO8601(),
    query('groupBy')
      .optional()
      .isIn(['day', 'week', 'month'])
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const result = await adminService.getInvestmentReports({
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string
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
 * GET /api/admin/reports/businesses
 * Get business reports
 */
router.get(
  '/reports/businesses',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.getBusinessReports();

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
 * POST /api/admin/create-admin
 * Create a new admin user (super admin only - first admin)
 */
router.post(
  '/create-admin',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
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

      const adminId = (req as any).user.id;
      const { email, password, firstName, lastName } = req.body;

      const result = await adminService.createAdmin(
        { email, password, firstName, lastName },
        adminId
      );

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

