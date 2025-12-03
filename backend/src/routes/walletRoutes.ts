/**
 * Wallet & Payment Routes for InvestGhanaHub
 * Handles deposits, withdrawals, and wallet management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { paymentService } from '../services/paymentService';
import { authMiddleware } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// All wallet routes require authentication
router.use(authMiddleware);

/**
 * GET /api/wallet
 * Get user's wallet details
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const wallet = await paymentService.getWallet(userId);

      res.status(200).json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/wallet/transactions
 * Get wallet transaction history
 */
router.get(
  '/transactions',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { page = '1', limit = '20' } = req.query;

      const result = await paymentService.getWalletTransactions(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
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
 * POST /api/wallet/deposit
 * Initiate a deposit via Paystack
 */
router.post(
  '/deposit',
  [
    body('amount')
      .isFloat({ min: 10 })
      .withMessage('Minimum deposit amount is 10 GHS'),
    body('paymentMethod')
      .isIn(['MOMO_MTN', 'MOMO_VODAFONE', 'MOMO_AIRTELTIGO', 'CARD'])
      .withMessage('Invalid payment method'),
    body('phoneNumber')
      .optional()
      .matches(/^(\+233|0)\d{9}$/)
      .withMessage('Invalid Ghana phone number'),
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
      const { amount, paymentMethod, phoneNumber } = req.body;

      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // For mobile money, phone number is required
      if (paymentMethod.startsWith('MOMO_') && !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required for mobile money payments',
        });
        return;
      }

      const result = await paymentService.initiateDeposit({
        userId,
        amount,
        email: user.email,
        paymentMethod,
        phoneNumber,
      });

      res.status(200).json({
        success: true,
        message: 'Payment initiated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/wallet/verify-payment
 * Verify payment status
 */
router.post(
  '/verify-payment',
  [
    body('reference')
      .trim()
      .notEmpty()
      .withMessage('Payment reference is required'),
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

      const { reference } = req.body;
      const result = await paymentService.verifyPayment(reference);

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
 * POST /api/wallet/withdraw
 * Initiate a withdrawal to mobile money
 */
router.post(
  '/withdraw',
  [
    body('amount')
      .isFloat({ min: 50 })
      .withMessage('Minimum withdrawal amount is 50 GHS'),
    body('phoneNumber')
      .matches(/^(\+233|0)\d{9}$/)
      .withMessage('Invalid Ghana phone number'),
    body('provider')
      .isIn(['MTN', 'VODAFONE', 'AIRTELTIGO'])
      .withMessage('Invalid mobile money provider'),
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
      const { amount, phoneNumber, provider } = req.body;

      // Check KYC status
      const kyc = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (!kyc || kyc.status !== 'APPROVED') {
        res.status(403).json({
          success: false,
          message: 'KYC verification required for withdrawals',
        });
        return;
      }

      const result = await paymentService.initiateWithdrawal(userId, amount, phoneNumber, provider);

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
 * GET /api/wallet/payments
 * Get payment history
 */
router.get(
  '/payments',
  [
    query('type').optional().isIn(['DEPOSIT', 'WITHDRAWAL']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { type, page = '1', limit = '20' } = req.query;

      const result = await paymentService.getPaymentHistory(
        userId,
        type as string,
        parseInt(page as string),
        parseInt(limit as string)
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
 * POST /api/wallet/webhook
 * Paystack webhook endpoint
 */
router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify webhook signature
      const hash = require('crypto')
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        res.status(401).json({ success: false });
        return;
      }

      const event = req.body;

      // Handle different event types
      switch (event.event) {
        case 'charge.success':
          await paymentService.verifyPayment(event.data.reference);
          break;
        // Add more event handlers as needed
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false });
    }
  }
);

export default router;

