/**
 * Authentication Routes for InvestGhanaHub
 * Handles user registration, login, and profile management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/authService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// ===========================================
// VALIDATION RULES
// ===========================================

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('phone')
    .optional()
    .matches(/^(\+233|0)\d{9}$/)
    .withMessage('Please provide a valid Ghana phone number'),
  body('role')
    .optional()
    .isIn(['INVESTOR', 'BUSINESS_OWNER'])
    .withMessage('Role must be INVESTOR or BUSINESS_OWNER')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /api/auth/register
 * Register a new user (investor or business owner)
 */
router.post(
  '/register',
  registerValidation,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { email, password, firstName, lastName, phone, role } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: role || 'INVESTOR'
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please complete KYC verification.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  loginValidation,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, password, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/profile
 * Get current user's profile (protected route)
 */
router.get(
  '/profile',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const profile = await authService.getProfile(userId);

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/auth/profile
 * Update current user's profile (protected route)
 */
router.put(
  '/profile',
  authMiddleware,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('First name must be less than 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Last name must be less than 50 characters'),
    body('phone')
      .optional()
      .matches(/^(\+233|0)\d{9}$/)
      .withMessage('Please provide a valid Ghana phone number')
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

      const userId = (req as any).user.id;
      const { firstName, lastName, phone } = req.body;

      const profile = await authService.updateProfile(userId, {
        firstName,
        lastName,
        phone
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/change-password
 * Change user's password (protected route)
 */
router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number')
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

      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

