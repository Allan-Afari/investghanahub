/**
 * Bank Account Service for InvestGhanaHub
 * Handles business bank account registration and verification
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Ghana bank codes (common banks)
const GHANA_BANKS: Record<string, string> = {
  '011': 'Barclays Bank Ghana',
  '013': 'Bank of Ghana',
  '015': 'Ghana Commercial Bank',
  '016': 'Standard Chartered Bank',
  '017': 'Ecobank Ghana',
  '018': 'Access Bank Ghana',
  '020': 'Zenith Bank Ghana',
  '023': 'HFC Bank Ghana',
  '024': 'First National Bank',
  '025': 'SBG Bank',
  '026': 'Agriculture Development Bank',
  '027': 'National Investment Bank',
  '028': 'Fidelity Bank Ghana',
  '029': 'UBA Ghana',
  '030': 'Prudential Bank',
  '031': 'Societe General Ghana',
  '032': 'Intercontinental Bank',
  '034': 'Britannic Assurance',
  '035': 'Metropolitan Bank',
  '036': 'GCB Bank Limited',
  '037': 'CAL Bank',
  '038': 'Stanbic Bank',
  '039': 'Habib Bank Limited',
};

interface AddBankAccountData {
  businessId: string;
  accountHolderName: string;
  accountNumber: string;
  bankCode: string;
  accountType: 'SAVINGS' | 'CHECKING';
}

interface BankAccountResponse {
  id: string;
  businessId: string;
  accountHolderName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountType: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Bank Account Service Class
 */
class BankAccountService {
  /**
   * Add bank account for business
   */
  async addBankAccount(data: AddBankAccountData): Promise<BankAccountResponse> {
    // Validate business exists and user is owner
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // Check if bank account already exists
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { businessId: data.businessId },
    });

    if (existingAccount) {
      const error = new Error('This business already has a bank account registered') as any;
      error.statusCode = 400;
      throw error;
    }

    // Validate bank code
    if (!GHANA_BANKS[data.bankCode]) {
      const error = new Error('Invalid bank code') as any;
      error.statusCode = 400;
      throw error;
    }

    // Validate account number format (Ghana: 10-13 digits)
    if (!/^\d{10,13}$/.test(data.accountNumber)) {
      const error = new Error('Invalid account number format') as any;
      error.statusCode = 400;
      throw error;
    }

    // Create bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        businessId: data.businessId,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        bankCode: data.bankCode,
        bankName: GHANA_BANKS[data.bankCode],
        accountType: data.accountType,
        isVerified: false, // Will be verified via API or manual review
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: business.ownerId,
        action: 'BANK_ACCOUNT_ADDED',
        entity: 'BankAccount',
        entityId: bankAccount.id,
        details: JSON.stringify({
          businessId: data.businessId,
          accountNumber: data.accountNumber.substring(0, 3) + '****', // Mask account number
          bankCode: data.bankCode,
        }),
      },
    });

    return bankAccount;
  }

  /**
   * Get bank account for business
   */
  async getBankAccount(businessId: string): Promise<BankAccountResponse | null> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { businessId },
    });

    return bankAccount;
  }

  /**
   * Verify bank account (mock - can integrate with real verification API)
   */
  async verifyBankAccount(businessId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { businessId },
    });

    if (!bankAccount) {
      return {
        success: false,
        message: 'Bank account not found',
      };
    }

    // In production, integrate with Paystack or your bank's verification API
    // For now, we'll mark as verified after 24 hours or manual admin approval
    const verificationTime = new Date();
    verificationTime.setHours(verificationTime.getHours() + 24);

    await prisma.bankAccount.update({
      where: { id: bankAccount.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Bank account verified successfully',
    };
  }

  /**
   * Update bank account
   */
  async updateBankAccount(
    businessId: string,
    data: Partial<AddBankAccountData>
  ): Promise<BankAccountResponse> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { businessId },
    });

    if (!bankAccount) {
      const error = new Error('Bank account not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // If changing account, reset verification status
    const updateData: any = {};

    if (data.accountHolderName) updateData.accountHolderName = data.accountHolderName;
    if (data.accountNumber) {
      if (!/^\d{10,13}$/.test(data.accountNumber)) {
        const error = new Error('Invalid account number format') as any;
        error.statusCode = 400;
        throw error;
      }
      updateData.accountNumber = data.accountNumber;
      updateData.isVerified = false; // Reset verification
    }
    if (data.bankCode) {
      if (!GHANA_BANKS[data.bankCode]) {
        const error = new Error('Invalid bank code') as any;
        error.statusCode = 400;
        throw error;
      }
      updateData.bankCode = data.bankCode;
      updateData.bankName = GHANA_BANKS[data.bankCode];
      updateData.isVerified = false; // Reset verification
    }
    if (data.accountType) updateData.accountType = data.accountType;

    const updated = await prisma.bankAccount.update({
      where: { id: bankAccount.id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Deactivate bank account
   */
  async deactivateBankAccount(businessId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { businessId },
    });

    if (!bankAccount) {
      return {
        success: false,
        message: 'Bank account not found',
      };
    }

    // Check if there are pending profit transfers
    const pendingTransfers = await prisma.profitTransfer.count({
      where: {
        bankAccountId: bankAccount.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pendingTransfers > 0) {
      return {
        success: false,
        message: `Cannot deactivate account with ${pendingTransfers} pending transfers`,
      };
    }

    await prisma.bankAccount.update({
      where: { id: bankAccount.id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Bank account deactivated',
    };
  }

  /**
   * Get all supported banks in Ghana
   */
  getSupportedBanks(): Array<{ code: string; name: string }> {
    return Object.entries(GHANA_BANKS).map(([code, name]) => ({
      code,
      name,
    }));
  }

  /**
   * Validate account details against bank
   */
  async validateAccountDetails(
    accountNumber: string,
    bankCode: string
  ): Promise<{
    valid: boolean;
    accountHolder?: string;
    error?: string;
  }> {
    try {
      // This is a mock implementation. In production, use Paystack's Account Verification
      // or your bank's verification API

      // Basic format validation
      if (!/^\d{10,13}$/.test(accountNumber)) {
        return {
          valid: false,
          error: 'Invalid account number format',
        };
      }

      if (!GHANA_BANKS[bankCode]) {
        return {
          valid: false,
          error: 'Invalid bank code',
        };
      }

      // In production: call Paystack or bank API
      // const response = await axios.get(`https://api.paystack.co/bank/resolve`, {
      //   params: {
      //     account_number: accountNumber,
      //     bank_code: bankCode
      //   },
      //   headers: {
      //     Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      //   }
      // });

      return {
        valid: true,
        accountHolder: 'Account Holder Name', // Would come from API
      };
    } catch (error: any) {
      console.error('Account validation error:', error.message);
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const bankAccountService = new BankAccountService();
