/**
 * Password Reset Routes for InvestGhanaHub
 * Handles forgot password and reset functionality
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { emailService } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/password/forgot
 * Request password reset email
 */
router.post(
  '/forgot',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
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

      const { email } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Delete any existing reset tokens for this user
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id },
      });

      // Create new reset token (expires in 1 hour)
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          entity: 'User',
          entityId: user.id,
          ipAddress: req.ip,
        },
      });

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/password/reset
 * Reset password with token
 */
router.post(
  '/reset',
  [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
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

      const { token, password } = req.body;

      // Hash the provided token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid reset token
      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token: hashedToken,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!resetRecord) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token. Please request a new password reset.',
        });
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password
      await prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });

      // Mark token as used
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: 'PASSWORD_RESET_COMPLETED',
          entity: 'User',
          entityId: resetRecord.userId,
          ipAddress: req.ip,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/password/validate-token
 * Check if reset token is valid
 */
router.post(
  '/validate-token',
  [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token: hashedToken,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!resetRecord) {
        res.status(400).json({
          success: false,
          valid: false,
          message: 'Invalid or expired reset token',
        });
        return;
      }

      res.status(200).json({
        success: true,
        valid: true,
        message: 'Token is valid',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

