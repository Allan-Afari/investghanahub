import { env } from '../config/env';

// Paystack instance
const paystack = require('paystack')(env.PAYSTACK_SECRET_KEY);

export interface InitializeTransactionParams {
  email: string;
  amount: number; // in kobo (lowest currency unit)
  currency?: string;
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface VerifyTransactionParams {
  reference: string;
}

export interface CreateTransferParams {
  source: 'balance'; // Use wallet balance
  amount: number; // in kobo
  recipient: {
    type: 'nuban' | 'bank_account';
    name: string;
    account_number: string;
    bank_code: string;
  };
  currency?: string;
  reference?: string;
  reason?: string;
}

export interface CreateCustomerParams {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface ValidateBankAccountParams {
  account_number: string;
  bank_code: string;
}

export class PaystackService {
  /**
   * Initialize a payment transaction
   */
  async initializeTransaction(params: InitializeTransactionParams) {
    try {
      const response = await paystack.transaction.initialize({
        email: params.email,
        amount: params.amount,
        currency: params.currency || 'GHS',
        reference: params.reference || this.generateReference(),
        callback_url: params.callback_url || `${env.FRONTEND_URL}/payment/callback`,
        metadata: params.metadata || {},
      });

      if (response.status) {
        return {
          success: true,
          data: response.data,
          authorization_url: response.data.authorization_url,
          reference: response.data.reference,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to initialize transaction',
      };
    } catch (error) {
      console.error('Paystack initializeTransaction error:', error);
      return {
        success: false,
        message: 'Payment initialization failed',
      };
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyTransaction(params: VerifyTransactionParams) {
    try {
      const response = await paystack.transaction.verify(params.reference);

      if (response.status && response.data.status === 'success') {
        return {
          success: true,
          data: response.data,
          amount: response.data.amount,
          currency: response.data.currency,
          reference: response.data.reference,
          metadata: response.data.metadata,
        };
      }

      return {
        success: false,
        message: response.message || 'Transaction verification failed',
      };
    } catch (error) {
      console.error('Paystack verifyTransaction error:', error);
      return {
        success: false,
        message: 'Transaction verification failed',
      };
    }
  }

  /**
   * Create a transfer to bank account
   */
  async createTransfer(params: CreateTransferParams) {
    try {
      const response = await paystack.transfer.create({
        source: params.source,
        amount: params.amount,
        recipient: params.recipient,
        currency: params.currency || 'GHS',
        reference: params.reference || this.generateReference('TRF'),
        reason: params.reason || 'Investment withdrawal',
      });

      if (response.status) {
        return {
          success: true,
          data: response.data,
          reference: response.data.reference,
          transfer_code: response.data.transfer_code,
        };
      }

      return {
        success: false,
        message: response.message || 'Transfer failed',
      };
    } catch (error) {
      console.error('Paystack createTransfer error:', error);
      return {
        success: false,
        message: 'Transfer failed',
      };
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(params: CreateCustomerParams) {
    try {
      const response = await paystack.customer.create({
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        phone: params.phone,
        metadata: params.metadata || {},
      });

      if (response.status) {
        return {
          success: true,
          data: response.data,
          customer_code: response.data.customer_code,
        };
      }

      return {
        success: false,
        message: response.message || 'Customer creation failed',
      };
    } catch (error) {
      console.error('Paystack createCustomer error:', error);
      return {
        success: false,
        message: 'Customer creation failed',
      };
    }
  }

  /**
   * Validate bank account details
   */
  async validateBankAccount(params: ValidateBankAccountParams) {
    try {
      const response = await paystack.verification.resolveAccount({
        account_number: params.account_number,
        bank_code: params.bank_code,
      });

      if (response.status) {
        return {
          success: true,
          data: response.data,
          account_name: response.data.account_name,
          account_number: response.data.account_number,
          bank_id: response.data.bank_id,
        };
      }

      return {
        success: false,
        message: response.message || 'Bank account validation failed',
      };
    } catch (error) {
      console.error('Paystack validateBankAccount error:', error);
      return {
        success: false,
        message: 'Bank account validation failed',
      };
    }
  }

  /**
   * Get bank list
   */
  async getBanks() {
    try {
      const response = await paystack.misc.listBanks({ country: 'ghana' });

      if (response.status) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to fetch banks',
      };
    } catch (error) {
      console.error('Paystack getBanks error:', error);
      return {
        success: false,
        message: 'Failed to fetch banks',
      };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(perPage?: number, page?: number) {
    try {
      const response = await paystack.transaction.list({
        perPage: perPage || 50,
        page: page || 1,
      });

      if (response.status) {
        return {
          success: true,
          data: response.data,
          meta: response.meta,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to fetch transactions',
      };
    } catch (error) {
      console.error('Paystack getTransactions error:', error);
      return {
        success: false,
        message: 'Failed to fetch transactions',
      };
    }
  }

  /**
   * Generate unique reference
   */
  private generateReference(prefix: string = 'INV'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.PAYSTACK_SECRET_KEY) {
      return false;
    }

    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }
}

// Export singleton instance
export const paystackService = new PaystackService();
