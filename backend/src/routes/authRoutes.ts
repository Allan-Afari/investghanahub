/**
 * Authentication Routes for InvestGhanaHub
 * Handles user registration, login, and profile management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { authMiddleware } from '../middleware/authMiddleware';
import { emailService } from '../services/emailService';
import {
  validate,
  registerValidationSchema,
  loginValidationSchema,
  validatePasswordStrength
} from '../middleware/advancedSecurityMiddleware';
import Joi from 'joi';

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).trim().optional(),
  lastName: Joi.string().min(2).max(50).trim().optional(),
  phone: Joi.string().pattern(/^(\+233|0)[2-5][0-9]{8}$/).optional(),
  bio: Joi.string().max(500).optional(),
  expertise: Joi.string().max(100).optional(),
  experience: Joi.string().max(300).optional(),
  website: Joi.string().uri().optional(),
  linkedin: Joi.string().uri().optional(),
});

const verificationStatusSchema = Joi.object({
  status: Joi.string().valid('UNVERIFIED', 'VERIFIED', 'PREMIUM', 'REJECTED').required(),
});

const upgradePremiumSchema = Joi.object({
  tier: Joi.string().valid('PREMIUM', 'VIP').required(),
  duration: Joi.number().integer().min(1).max(12).required(), // 1-12 months
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'New password must be at least 8 characters long',
    }),
});

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /api/auth/register
 * Register a new user (investor or business owner)
 * Enhanced with comprehensive validation and password strength requirements
 */
router.post(
  '/register',
  validate(registerValidationSchema),
  validatePasswordStrength,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName, phone, role } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: role || 'INVESTOR'
      });

      // Send welcome email
      await emailService.sendWelcomeEmail(email, firstName);

      // Set auth cookie (HttpOnly) for enhanced security
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
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
 * Enhanced with security logging
 */
router.post(
  '/login',
  validate(loginValidationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, password, ipAddress, userAgent);

      // Set secure auth cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/register/investor
 * Register a new investor with streamlined flow
 */
router.post(
  '/register/investor',
  validate(registerValidationSchema),
  validatePasswordStrength,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'INVESTOR'
      });

      // Set auth cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
      });

      res.status(201).json({
        success: true,
        message: 'Investor account created successfully. Please complete KYC verification to start investing.',
        data: {
          user: result.user,
          token: result.token,
          nextSteps: [
            '1. Complete KYC verification',
            '2. Browse available investment opportunities',
            '3. Make your first investment',
            '4. Track your portfolio'
          ]
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/register/business-owner
 * Register a new business owner with guided capital raising flow
 */
router.post(
  '/register/business-owner',
  validate(registerValidationSchema),
  validatePasswordStrength,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'BUSINESS_OWNER'
      });

      // Set auth cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
      });

      res.status(201).json({
        success: true,
        message: 'Business owner account created successfully. Next: register your business and complete KYC.',
        data: {
          user: result.user,
          token: result.token,
          nextSteps: [
            '1. Complete personal KYC verification',
            '2. Register your business details',
            '3. Wait for admin business verification',
            '4. Create investment opportunities',
            '5. Start raising capital'
          ]
        }
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
 * Enhanced with Joi validation
 */
router.put(
  '/profile',
  authMiddleware,
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
 * Enhanced with strong password requirements
 */
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again with your new password.'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user and clear auth cookie
 */
router.post(
  '/logout',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    // Clear auth cookie
    res.clearCookie('token');
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
);

/**
 * PUT /api/auth/verification-status
 * Update user verification status (Admin only)
 */
router.put(
  '/verification-status/:userId',
  authMiddleware,
  validate(verificationStatusSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminUser = (req as any).user;
      
      // Check if user is admin
      if (adminUser.role !== 'ADMIN') {
        const error = new Error('Admin access required') as any;
        error.statusCode = 403;
        throw error;
      }

      const { userId } = req.params;
      const { status } = req.body;

      const user = await authService.updateVerificationStatus(userId, status, adminUser.id);

      res.status(200).json({
        success: true,
        message: `User verification status updated to ${status}`,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/upgrade-premium
 * Upgrade user to premium tier
 */
router.post(
  '/upgrade-premium',
  authMiddleware,
  validate(upgradePremiumSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { tier, duration } = req.body;

      const user = await authService.upgradeToPremium(userId, tier, duration);

      res.status(200).json({
        success: true,
        message: `Successfully upgraded to ${tier} tier for ${duration} months`,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/users/by-verification-status/:status
 * Get users by verification status (Admin only)
 */
router.get(
  '/users/by-verification-status/:status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminUser = (req as any).user;
      
      // Check if user is admin
      if (adminUser.role !== 'ADMIN') {
        const error = new Error('Admin access required') as any;
        error.statusCode = 403;
        throw error;
      }

      const { status } = req.params;
      const users = await authService.getUsersByVerificationStatus(status as any);

      res.status(200).json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

