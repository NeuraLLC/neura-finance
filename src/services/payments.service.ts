import Stripe from 'stripe';
import db from './database.service';
import merchantsService, { Merchant } from './merchants.service';
import { AppError } from '../middleware/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

interface Customer {
  id: string;
  merchant_id: string;
  email: string;
  name?: string;
  stripe_customer_id: string;
}

interface Transaction {
  id: string;
  merchant_id: string;
  customer_id: string | null;
  amount: number;
  currency: string;
  description?: string;
  payment_method: string;
  stripe_payment_intent_id: string;
  stripe_charge_id?: string;
  status: string;
  platform_fee: number;
  merchant_amount: number;
  idempotency_key?: string;
  metadata?: Record<string, any>;
  refunded?: boolean;
  refunded_amount?: number;
  created_at?: string;
}

interface Refund {
  id: string;
  transaction_id: string;
  merchant_id: string;
  amount: number;
  reason?: string;
  stripe_refund_id: string;
  status: string;
}

interface PaymentData {
  amount: number;
  currency?: string;
  description?: string;
  customer_email?: string;
  customer_name?: string;
  payment_method?: string;
  idempotency_key?: string;
  metadata?: Record<string, any>;
}

interface CreatePaymentResponse {
  transaction_id: string;
  client_secret: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_intent_id: string;
}

interface ListPaymentsOptions {
  limit?: number;
  offset?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface RefundData {
  amount?: number;
  reason?: string;
}

interface RefundResponse {
  refund_id: string;
  transaction_id: string;
  amount: number;
  status: string;
  stripe_refund_id: string;
}

interface CancelResponse {
  transaction_id: string;
  status: string;
}

class PaymentsService {
  /**
   * Create a payment intent
   */
  async createPayment(apiKey: string, paymentData: PaymentData): Promise<CreatePaymentResponse> {
    const {
      amount,
      currency = 'usd',
      description,
      customer_email,
      customer_name,
      payment_method,
      idempotency_key,
      metadata = {},
    } = paymentData;

    // Validate merchant
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    // Determine if using test or live mode
    const isTestMode = apiKey.startsWith('npk_test_');

    // Validate amount
    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400, 'INVALID_AMOUNT');
    }

    // Check if merchant has Stripe Connect account
    if (!merchant.stripe_account_id) {
      throw new AppError('Stripe Connect account not configured', 400, 'STRIPE_NOT_CONFIGURED');
    }

    // 30-day enforcement for deferred onboarding
    if (merchant.deferred_onboarding_enabled && !merchant.stripe_onboarding_complete && merchant.first_payment_at) {
      const firstPaymentDate = new Date(merchant.first_payment_at);
      const daysSinceFirstPayment = Math.floor((Date.now() - firstPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceFirstPayment >= 30) {
        throw new AppError(
          'You must complete your Stripe onboarding before processing new payments. Your 30-day grace period has ended. Please complete your onboarding in the Settings page.',
          403,
          'ONBOARDING_REQUIRED'
        );
      }
    }

    if (!merchant.stripe_charges_enabled) {
      throw new AppError('Stripe charges not enabled for this merchant', 400, 'CHARGES_NOT_ENABLED');
    }

    // Create or get customer
    let customer: Customer | null = null;
    if (customer_email) {
      customer = await db.findOne<Customer>('customers', {
        merchant_id: merchant.id,
        email: customer_email,
      });

      if (!customer) {
        // Create Stripe customer
        const stripeCustomer = await stripe.customers.create({
          email: customer_email,
          name: customer_name,
          metadata: {
            merchant_id: merchant.id,
          },
        }, {
          stripeAccount: merchant.stripe_account_id,
        });

        // Save customer to database
        customer = await db.insert<Customer>('customers', {
          merchant_id: merchant.id,
          email: customer_email,
          name: customer_name,
          stripe_customer_id: stripeCustomer.id,
        });
      }
    }

    // Calculate platform fee (2.9% + 30 cents)
    const platformFee = Math.round(amount * 0.029 + 30);
    const merchantAmount = amount - platformFee;

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      description,
      customer: customer?.stripe_customer_id,
      payment_method_types: ['card'],
      application_fee_amount: platformFee,
      metadata: {
        merchant_id: merchant.id,
        environment: merchant.environment,
        ...metadata,
      },
    }, {
      stripeAccount: merchant.stripe_account_id,
      idempotencyKey: idempotency_key,
    });

    // Create transaction record
    const transaction = await db.insert<Transaction>('transactions', {
      merchant_id: merchant.id,
      customer_id: customer?.id || null,
      amount,
      currency: currency.toLowerCase(),
      description,
      payment_method: payment_method || 'card',
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      platform_fee: platformFee,
      merchant_amount: merchantAmount,
      idempotency_key,
      metadata: {
        environment: merchant.environment,
        ...metadata,
      },
    });

    return {
      transaction_id: transaction.id,
      client_secret: paymentIntent.client_secret,
      amount,
      currency,
      status: 'pending',
      payment_intent_id: paymentIntent.id,
    };
  }

  /**
   * Get payment by ID
   */
  async getPayment(apiKey: string, transactionId: string): Promise<Transaction> {
    // Validate merchant
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    // Get transaction
    const transaction = await db.findById<Transaction>('transactions', transactionId);

    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Ensure transaction belongs to merchant
    if (transaction.merchant_id !== merchant.id) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    return transaction;
  }

  /**
   * List payments for merchant
   */
  async listPayments(apiKey: string, options: ListPaymentsOptions = {}): Promise<Transaction[]> {
    // Validate merchant
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    const {
      limit = 10,
      offset = 0,
      status,
      start_date,
      end_date,
    } = options;

    const client = db.getClient();
    let query = client
      .from('transactions')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    return transactions || [];
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    apiKey: string,
    transactionId: string,
    refundData: RefundData
  ): Promise<RefundResponse> {
    const { amount, reason } = refundData;

    // Validate merchant
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    // Get transaction
    const transaction = await db.findById<Transaction>('transactions', transactionId);

    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Ensure transaction belongs to merchant
    if (transaction.merchant_id !== merchant.id) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Check if transaction is refundable
    if (transaction.status !== 'succeeded') {
      throw new AppError('Only successful transactions can be refunded', 400, 'NOT_REFUNDABLE');
    }

    // Validate refund amount
    const refundAmount = amount || transaction.amount;
    const totalRefunded = transaction.refunded_amount || 0;
    const availableForRefund = transaction.amount - totalRefunded;

    if (refundAmount > availableForRefund) {
      throw new AppError(
        `Refund amount exceeds available balance. Available: ${availableForRefund}`,
        400,
        'INVALID_REFUND_AMOUNT'
      );
    }

    // Create refund with Stripe
    const stripeRefund = await stripe.refunds.create({
      payment_intent: transaction.stripe_payment_intent_id,
      amount: refundAmount,
      reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
      metadata: {
        merchant_id: merchant.id,
        transaction_id: transactionId,
      },
    }, {
      stripeAccount: merchant.stripe_account_id,
    });

    // Create refund record
    const refund = await db.insert<Refund>('refunds', {
      transaction_id: transactionId,
      merchant_id: merchant.id,
      amount: refundAmount,
      reason,
      stripe_refund_id: stripeRefund.id,
      status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
    });

    // Update transaction
    const newRefundedAmount = totalRefunded + refundAmount;
    const isFullyRefunded = newRefundedAmount >= transaction.amount;

    await db.update<Transaction>('transactions', transactionId, {
      refunded: true,
      refunded_amount: newRefundedAmount,
      refunded_at: new Date().toISOString(),
      status: isFullyRefunded ? 'refunded' : transaction.status,
    } as any);

    return {
      refund_id: refund.id,
      transaction_id: transactionId,
      amount: refundAmount,
      status: refund.status,
      stripe_refund_id: stripeRefund.id,
    };
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(apiKey: string, transactionId: string): Promise<CancelResponse> {
    // Validate merchant
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    // Get transaction
    const transaction = await db.findById<Transaction>('transactions', transactionId);

    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Ensure transaction belongs to merchant
    if (transaction.merchant_id !== merchant.id) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Check if transaction is cancelable
    if (transaction.status !== 'pending' && transaction.status !== 'processing') {
      throw new AppError('Only pending or processing transactions can be canceled', 400, 'NOT_CANCELABLE');
    }

    // Cancel payment intent with Stripe
    if (transaction.stripe_payment_intent_id) {
      await stripe.paymentIntents.cancel(
        transaction.stripe_payment_intent_id,
        {},
        { stripeAccount: merchant.stripe_account_id }
      );
    }

    // Update transaction
    await db.update<Transaction>('transactions', transactionId, {
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    } as any);

    return {
      transaction_id: transactionId,
      status: 'canceled',
    };
  }
}

export default new PaymentsService();
