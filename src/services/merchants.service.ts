import crypto from 'crypto';
import db from './database.service';
import { AppError } from '../middleware/errorHandler';

export interface Branding {
  logo_url?: string | null;
  primary_color?: string;
  merchant_display_name?: string | null;
  default_currency?: string;
  payment_methods?: string[];
}

export interface Merchant {
  id: string;
  business_name: string;
  business_email: string;
  business_type: string | null;
  password: string;
  api_key: string;
  api_secret: string;
  sandbox_api_key?: string;
  sandbox_api_secret?: string;
  webhook_secret?: string;
  webhook_url?: string;
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  status: string;
  environment: string;
  is_active?: boolean;
  default_currency?: string;
  accepted_payment_methods?: string[];
  brand_logo_url?: string;
  brand_color?: string;
  brand_name?: string;
  branding?: Branding;
  created_at?: string;
  updated_at?: string;
  // OAuth fields
  oauth_provider?: string;
  oauth_user_id?: string;
  // Deferred onboarding fields
  deferred_onboarding_enabled?: boolean;
  onboarding_notification_sent?: boolean;
  onboarding_notification_count?: number;
  last_onboarding_notification_at?: string;
  earnings_count?: number;
  first_payment_at?: string;
  country?: string;
  pending_balance?: number;
  balance?: number;
}

interface Transaction {
  id: string;
  merchant_id: string;
  amount: number;
  status: string;
  refunded?: boolean;
  refunded_amount?: number;
}

interface MerchantStats {
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  total_revenue: number;
  total_refunded: number;
  net_revenue: number;
  customer_count: number;
  success_rate: string | number;
}

interface EnvironmentResponse {
  environment: string;
  sandbox_api_key?: string;
  production_api_key: string;
}

interface WebhookResponse {
  webhook_url: string | null;
  webhook_secret: string;
}

class MerchantsService {
  /**
   * Get merchant by ID
   */
  async getMerchantById(merchantId: string): Promise<Merchant> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Don't expose sensitive fields
    delete (merchant as any).password;
    delete (merchant as any).api_secret;
    delete (merchant as any).webhook_secret;

    return merchant;
  }

  /**
   * Get API credentials (includes secret)
   * WARNING: Only call this for authenticated merchant viewing their own credentials
   */
  async getApiCredentials(merchantId: string): Promise<{
    api_key: string;
    sandbox_api_key: string | undefined;
    api_secret: string;
    environment: string;
  }> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Return the correct secret based on current environment
    const currentSecret = merchant.environment === 'sandbox'
      ? (merchant as any).sandbox_api_secret || merchant.api_secret
      : merchant.api_secret;

    return {
      api_key: merchant.api_key,
      sandbox_api_key: merchant.sandbox_api_key,
      api_secret: currentSecret,
      environment: merchant.environment,
    };
  }

  /**
   * Get merchant by API key
   */
  async getMerchantByApiKey(apiKey: string): Promise<Merchant> {
    let merchant: Merchant | null;
    let isSandbox = false;

    // Check if it's a sandbox or production key
    if (apiKey.startsWith('npk_test_')) {
      merchant = await db.findOne<Merchant>('merchants', { sandbox_api_key: apiKey });
      isSandbox = true;
    } else if (apiKey.startsWith('npk_live_')) {
      merchant = await db.findOne<Merchant>('merchants', { api_key: apiKey });
      isSandbox = false;
    } else {
      throw new AppError('Invalid API key format', 401, 'INVALID_API_KEY');
    }

    if (!merchant) {
      throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
    }

    // Check if merchant is active
    if (!merchant.is_active || merchant.status === 'suspended' || merchant.status === 'closed') {
      throw new AppError('Merchant account is not active', 403, 'MERCHANT_INACTIVE');
    }

    // Set the correct api_secret based on which key was used
    // This ensures HMAC verification uses the right secret
    if (isSandbox) {
      merchant.api_secret = (merchant as any).sandbox_api_secret || merchant.api_secret;
    }

    return merchant;
  }

  /**
   * Switch merchant environment (sandbox/production)
   */
  async switchEnvironment(merchantId: string, environment: string): Promise<EnvironmentResponse> {
    if (!['sandbox', 'production'].includes(environment)) {
      throw new AppError('Invalid environment. Must be sandbox or production', 400, 'INVALID_ENVIRONMENT');
    }

    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Generate sandbox API key if switching to sandbox for the first time
    let sandboxApiKey = merchant.sandbox_api_key;
    if (environment === 'sandbox' && !sandboxApiKey) {
      sandboxApiKey = `npk_test_${crypto.randomBytes(24).toString('hex')}`;
    }

    // Update merchant environment
    await db.update<Merchant>('merchants', merchantId, {
      environment,
      sandbox_api_key: sandboxApiKey,
    });

    return {
      environment,
      sandbox_api_key: sandboxApiKey,
      production_api_key: merchant.api_key,
    };
  }

  /**
   * Update merchant webhook URL
   */
  async updateWebhookUrl(merchantId: string, webhookUrl: string | null): Promise<WebhookResponse> {
    // Validate webhook URL
    if (webhookUrl && !webhookUrl.startsWith('https://')) {
      throw new AppError('Webhook URL must use HTTPS', 400, 'INVALID_WEBHOOK_URL');
    }

    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Generate webhook secret if not exists
    let webhookSecret = merchant.webhook_secret;
    if (!webhookSecret) {
      webhookSecret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    }

    // Update merchant webhook settings
    await db.update<Merchant>('merchants', merchantId, {
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
    });

    return {
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
    };
  }

  /**
   * Get merchant statistics
   */
  async getMerchantStats(merchantId: string): Promise<MerchantStats> {
    const client = db.getClient();

    // Get transaction stats
    const { data: transactions } = await client
      .from('transactions')
      .select('*')
      .eq('merchant_id', merchantId);

    const totalTransactions = transactions?.length || 0;
    const successfulTransactions = transactions?.filter(t => t.status === 'succeeded').length || 0;
    const failedTransactions = transactions?.filter(t => t.status === 'failed').length || 0;
    const totalRevenue = transactions
      ?.filter(t => t.status === 'succeeded')
      .reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalRefunded = transactions
      ?.filter(t => t.refunded)
      .reduce((sum, t) => sum + t.refunded_amount, 0) || 0;

    // Get customer count
    const { count: customerCount } = await client
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchantId);

    return {
      total_transactions: totalTransactions,
      successful_transactions: successfulTransactions,
      failed_transactions: failedTransactions,
      total_revenue: totalRevenue,
      total_refunded: totalRefunded,
      net_revenue: totalRevenue - totalRefunded,
      customer_count: customerCount || 0,
      success_rate: totalTransactions > 0
        ? ((successfulTransactions / totalTransactions) * 100).toFixed(2)
        : 0,
    };
  }

  /**
   * Update merchant profile
   */
  async updateMerchantProfile(
    merchantId: string,
    updates: Partial<Merchant>
  ): Promise<Merchant> {
    const allowedFields: (keyof Merchant)[] = [
      'business_name',
      'business_type',
      'default_currency',
      'accepted_payment_methods',
      'brand_logo_url',
      'brand_color',
      'brand_name',
    ];

    // Filter updates to only allowed fields
    const filteredUpdates: Partial<Merchant> = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key as keyof Merchant)) {
        // @ts-ignore - TypeScript has trouble inferring the partial update types
        filteredUpdates[key as keyof Merchant] = updates[key as keyof Merchant];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      throw new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS');
    }

    const merchant = await db.update<Merchant>('merchants', merchantId, filteredUpdates);

    // Don't expose sensitive fields
    delete (merchant as any).password;
    delete (merchant as any).api_secret;
    delete (merchant as any).webhook_secret;

    return merchant;
  }

  /**
   * Get merchant branding configuration
   */
  async getBranding(merchantId: string): Promise<Branding> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Return branding or default values
    return merchant.branding || {
      logo_url: null,
      primary_color: '#2563eb',
      merchant_display_name: null,
      default_currency: merchant.default_currency || 'usd',
      payment_methods: ['card'],
    };
  }

  /**
   * Update merchant branding configuration
   */
  async updateBranding(
    merchantId: string,
    brandingUpdates: Partial<Branding>
  ): Promise<Branding> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Get current branding
    const currentBranding: Branding = merchant.branding || {
      logo_url: null,
      primary_color: '#2563eb',
      merchant_display_name: null,
      default_currency: merchant.default_currency || 'usd',
      payment_methods: ['card'],
    };

    // Merge with updates
    const updatedBranding: Branding = {
      ...currentBranding,
      ...brandingUpdates,
    };

    // Update merchant
    await db.update<Merchant>('merchants', merchantId, {
      branding: updatedBranding,
    } as any);

    return updatedBranding;
  }
}

export default new MerchantsService();
