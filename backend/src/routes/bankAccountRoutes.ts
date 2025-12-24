/**
 * Bank Account Routes for InvestGhanaHub
 * Handles bank account registration and management
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware';
import { bankAccountService } from '../services/bankAccountService';
import { paystackService } from '../services/paystackService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /bank-accounts
 * Add a bank account for business
 * Authorization: Business Owner
 */
router.post(
  '/',
  authMiddleware,
  [
    body('businessId').notEmpty().withMessage('Business ID is required'),
    body('accountHolderName')
      .notEmpty()
      .withMessage('Account holder name is required')
      .trim(),
    body('accountNumber')
      .notEmpty()
      .withMessage('Account number is required')
      .matches(/^\d{10,13}$/)
      .withMessage('Invalid account number format'),
    body('bankCode')
      .notEmpty()
      .withMessage('Bank code is required'),
    body('accountType')
      .isIn(['SAVINGS', 'CHECKING'])
      .withMessage('Invalid account type'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { businessId, accountHolderName, accountNumber, bankCode, accountType } =
        req.body;
      const userId = (req as any).user.id;

      // Verify user is the business owner
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      if (business.ownerId !== userId) {
        return res.status(403).json({ error: 'Not authorized to manage this business' });
      }

      // Validate bank account with Paystack first
      const validation = await paystackService.validateBankAccount({
        account_number: accountNumber,
        bank_code: bankCode,
      });

      if (!validation.success) {
        return res.status(400).json({
          error: 'Bank account validation failed',
          message: validation.message,
        });
      }

      // Add bank account with validated details
      const bankAccount = await bankAccountService.addBankAccount({
        businessId,
        accountHolderName,
        accountNumber,
        bankCode,
        accountType: accountType as 'SAVINGS' | 'CHECKING',
        paystackValidation: {
          account_name: validation.account_name,
          bank_id: validation.bank_id,
          verified_at: new Date(),
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Bank account added successfully',
        bankAccount: {
          ...bankAccount,
          accountNumber: bankAccount.accountNumber.substring(0, 3) + '****', // Mask
        },
      });
    } catch (error: any) {
      console.error('Error adding bank account:', error.message);
      return res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to add bank account',
      });
    }
  }
);

/**
 * GET /bank-accounts/:businessId
 * Get bank account for business
 * Authorization: Business Owner or Admin
 */
router.get(
  '/:businessId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      // Verify authorization
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      if (business.ownerId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const bankAccount = await bankAccountService.getBankAccount(businessId);

      if (!bankAccount) {
        return res.status(404).json({ error: 'No bank account found for this business' });
      }

      return res.json({
        success: true,
        bankAccount: {
          ...bankAccount,
          accountNumber: bankAccount.accountNumber.substring(0, 3) + '****', // Mask
        },
      });
    } catch (error: any) {
      console.error('Error getting bank account:', error.message);
      return res.status(500).json({ error: 'Failed to get bank account' });
    }
  }
);

/**
 * PUT /bank-accounts/:businessId
 * Update bank account
 * Authorization: Business Owner
 */
router.put(
  '/:businessId',
  authMiddleware,
  [
    body('accountHolderName')
      .optional()
      .notEmpty()
      .withMessage('Account holder name cannot be empty'),
    body('accountNumber')
      .optional()
      .matches(/^\d{10,13}$/)
      .withMessage('Invalid account number format'),
    body('bankCode').optional().notEmpty().withMessage('Bank code cannot be empty'),
    body('accountType')
      .optional()
      .isIn(['SAVINGS', 'CHECKING'])
      .withMessage('Invalid account type'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { businessId } = req.params;
      const userId = (req as any).user.id;

      // Verify user is the business owner
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      if (business.ownerId !== userId) {
        return res.status(403).json({ error: 'Not authorized to manage this business' });
      }

      const updated = await bankAccountService.updateBankAccount(businessId, req.body);

      return res.json({
        success: true,
        message: 'Bank account updated successfully',
        bankAccount: {
          ...updated,
          accountNumber: updated.accountNumber.substring(0, 3) + '****', // Mask
        },
      });
    } catch (error: any) {
      console.error('Error updating bank account:', error.message);
      return res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to update bank account',
      });
    }
  }
);

/**
 * POST /bank-accounts/:businessId/verify
 * Verify bank account
 * Authorization: Business Owner or Admin
 */
router.post(
  '/:businessId/verify',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      // Verify authorization
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      if (business.ownerId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const result = await bankAccountService.verifyBankAccount(businessId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      console.error('Error verifying bank account:', error.message);
      return res.status(500).json({ error: 'Failed to verify bank account' });
    }
  }
);

/**
 * DELETE /bank-accounts/:businessId
 * Deactivate bank account
 * Authorization: Business Owner
 */
router.delete(
  '/:businessId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;

      // Verify user is the business owner
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      if (business.ownerId !== userId) {
        return res.status(403).json({ error: 'Not authorized to manage this business' });
      }

      const result = await bankAccountService.deactivateBankAccount(businessId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error('Error deactivating bank account:', error.message);
      return res.status(500).json({ error: 'Failed to deactivate bank account' });
    }
  }
);

/**
 * GET /bank-accounts/supported-banks
 * Get list of supported banks
 */
router.get('/supported-banks', (req: Request, res: Response) => {
  try {
    const banks = bankAccountService.getSupportedBanks();
    return res.json({
      success: true,
      banks,
    });
  } catch (error: any) {
    console.error('Error getting supported banks:', error.message);
    return res.status(500).json({ error: 'Failed to get supported banks' });
  }
});

/**
 * POST /bank-accounts/validate
 * Validate account details
 */
router.post(
  '/validate',
  [
    body('accountNumber')
      .notEmpty()
      .withMessage('Account number is required')
      .matches(/^\d{10,13}$/)
      .withMessage('Invalid account number format'),
    body('bankCode').notEmpty().withMessage('Bank code is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { accountNumber, bankCode } = req.body;
      const result = await bankAccountService.validateAccountDetails(accountNumber, bankCode);

      return res.json(result);
    } catch (error: any) {
      console.error('Error validating account:', error.message);
      return res.status(500).json({ error: 'Failed to validate account' });
    }
  }
);

/**
 * GET /bank-accounts/banks
 * Get list of Ghanaian banks from Paystack
 */
router.get(
  '/banks',
  authMiddleware,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Error fetching banks:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch banks',
      });
    }
  }
);

/**
 * POST /bank-accounts/validate
 * Validate bank account details with Paystack
 */
router.post(
  '/validate',
  authMiddleware,
  [
    body('account_number').notEmpty().withMessage('Account number is required'),
    body('bank_code').notEmpty().withMessage('Bank code is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
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
    } catch (error: any) {
      console.error('Error validating bank account:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to validate bank account',
      });
    }
  }
);

export default router;
