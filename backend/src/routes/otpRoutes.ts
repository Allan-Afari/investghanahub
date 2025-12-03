/**
 * OTP Routes for InvestGhanaHub
 * Handles phone verification and OTP
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { smsService } from '../services/smsService';
import { authMiddleware } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/otp/send
 * Send OTP to user's phone
 */
router.post(
  '/send',
  authMiddleware,
  [
    body('phone')
      .matches(/^(\+233|0)\d{9}$/)
      .withMessage('Please provide a valid Ghana phone number'),
    body('type')
      .optional()
      .isIn(['PHONE_VERIFY', 'TRANSACTION', 'LOGIN'])
      .withMessage('Invalid OTP type'),
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
      const { phone, type = 'PHONE_VERIFY' } = req.body;

      // Update user's phone if not set
      await prisma.user.update({
        where: { id: userId },
        data: { phone },
      });

      const result = await smsService.sendOTP(userId, phone, type);

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/otp/verify
 * Verify OTP code
 */
router.post(
  '/verify',
  authMiddleware,
  [
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be 6 digits'),
    body('type')
      .optional()
      .isIn(['PHONE_VERIFY', 'TRANSACTION', 'LOGIN'])
      .withMessage('Invalid OTP type'),
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
      const { code, type = 'PHONE_VERIFY' } = req.body;

      const result = await smsService.verifyOTP(userId, code, type);

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/otp/status
 * Check if phone is verified
 */
router.get(
  '/status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, phoneVerified: true },
      });

      res.status(200).json({
        success: true,
        data: {
          phone: user?.phone,
          phoneVerified: user?.phoneVerified || false,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

