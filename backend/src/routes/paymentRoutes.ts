import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { paystackService } from '../services/paystackService';
import { paymentService } from '../services/paymentService';
import { disputeService } from '../services/disputeService';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const initializePaymentSchema = Joi.object({
  email: Joi.string().email().required(),
  amount: Joi.number().min(100).required(), // minimum 1 GHS (100 kobo)
  reference: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

const transferSchema = Joi.object({
  account_number: Joi.string().required(),
  bank_code: Joi.string().required(),
  account_name: Joi.string().required(),
  amount: Joi.number().min(100).required(),
  reason: Joi.string().optional(),
});

const bankAccountValidationSchema = Joi.object({
  account_number: Joi.string().required(),
  bank_code: Joi.string().required(),
});

/**
 * POST /api/payments/webhook
 * Paystack webhook handler (public endpoint)
 */
router.post(
  '/webhook',
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const rawBody = req.body as Buffer;
      const rawBodyString = rawBody?.toString('utf8') || '';

      let parsedBody: any;
      try {
        parsedBody = rawBodyString ? JSON.parse(rawBodyString) : {};
      } catch {
        parsedBody = {};
      }

      // Verify webhook signature
      if (!paystackService.verifyWebhookSignature(rawBodyString, signature)) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const event = parsedBody.event;

      switch (event) {
        case 'charge.success': {
          const paymentData = parsedBody.data;
          const reference = paymentData?.reference as string | undefined;

          if (reference) {
            try {
              await paymentService.verifyPayment(reference);
            } catch (e) {
              console.error('Webhook charge.success processing error:', e);
            }
          }

          break;
        }

        case 'charge.failed': {
          const paymentData = parsedBody.data;
          const reference = paymentData?.reference as string | undefined;
          if (reference) {
            try {
              await prisma.payment.updateMany({
                where: { reference, status: 'PENDING' },
                data: { status: 'FAILED' },
              });
            } catch (e) {
              console.error('Webhook charge.failed processing error:', e);
            }
          }
          break;
        }

        case 'charge.dispute': {
          try {
            await disputeService.upsertFromPaystackChargeDispute(parsedBody);
          } catch (e) {
            console.error('Webhook charge.dispute processing error:', e);
          }
          break;
        }

        case 'transfer.success':
        case 'transfer.failed':
          // Transfer handling will be implemented when withdrawal transfers are wired end-to-end.
          console.log('Transfer webhook:', event, parsedBody.data);
          break;

        default:
          console.log('Unhandled webhook event:', event);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  }
);

// Apply auth middleware to all remaining payment routes
router.use(authMiddleware);

/**
 * POST /api/payments/initialize
 * Initialize a payment transaction
 */
router.post(
  '/initialize',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error } = initializePaymentSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
        return;
      }

      const { email, amount } = req.body;
      const userId = (req as any).user.id;

      const result = await paymentService.initiateDeposit({
        userId,
        amount,
        email,
        paymentMethod: 'CARD',
      });

      res.status(200).json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          authorization_url: result.authorizationUrl,
          reference: result.reference,
          paymentId: result.paymentId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/payments/verify/:reference
 * Verify a payment transaction
 */
router.get(
  '/verify/:reference',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reference } = req.params;

      const result = await paymentService.verifyPayment(reference);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          data: result,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: result.message || 'Payment verification failed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/payments/transfer
 * Transfer funds to bank account
 */
router.post(
  '/transfer',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error } = transferSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
        return;
      }

      const { account_number, bank_code, account_name, amount, reason } = req.body;
      const userId = (req as any).user.id;

      // TODO: Check user wallet balance before transfer
      // TODO: Deduct from wallet if sufficient funds

      const result = await paystackService.createTransfer({
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: {
          type: 'bank_account',
          name: account_name,
          account_number,
          bank_code,
        },
        reason: reason || 'Investment withdrawal',
      });

      if (result.success) {
        // TODO: Create transfer record
        // TODO: Send withdrawal confirmation email
        
        res.status(200).json({
          success: true,
          message: 'Transfer initiated successfully',
          data: {
            reference: result.reference,
            transfer_code: result.transfer_code,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Transfer failed',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/payments/banks
 * Get list of Ghanaian banks
 */
router.get(
  '/banks',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await paystackService.getBanks();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Banks retrieved successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to fetch banks',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/payments/validate-bank
 * Validate bank account details
 */
router.post(
  '/validate-bank',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error } = bankAccountValidationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details[0].message,
        });
        return;
      }

      const { account_number, bank_code } = req.body;

      const result = await paystackService.validateBankAccount({
        account_number,
        bank_code,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Bank account validated successfully',
          data: {
            account_name: result.account_name,
            account_number: result.account_number,
            bank_id: result.bank_id,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Bank account validation failed',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
