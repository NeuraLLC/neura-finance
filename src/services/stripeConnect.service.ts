import Stripe from 'stripe';
import db from './database.service';
import { AppError } from '../middleware/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

interface Merchant {
  id: string;
  stripe_account_id?: string;
  status: string;
}

interface OAuthTokenResponse {
  stripe_user_id: string;
  access_token: string;
  refresh_token: string;
  stripe_publishable_key: string;
}

interface CallbackResponse {
  stripe_account_id: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  merchant_status: string;
}

interface AccountStatusResponse {
  connected: boolean;
  stripe_account_id?: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: Stripe.Account.Requirements;
  country?: string;
  default_currency?: string;
}

interface AccountLinkResponse {
  url: string;
  expires_at: number;
}

interface DisconnectResponse {
  success: boolean;
  message: string;
}

interface DashboardLinkResponse {
  url: string;
  created: number;
}

class StripeConnectService {
  /**
   * Generate Stripe Connect OAuth URL
   */
  generateConnectUrl(merchantId: string, state: string | null = null): string {
    const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI ||
                       `${process.env.APP_URL}/stripe-connect/callback`;

    const params = new URLSearchParams({
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID || '',
      state: state || merchantId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read_write',
    });

    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle Stripe Connect OAuth callback
   */
  async handleCallback(authorizationCode: string, merchantId: string): Promise<CallbackResponse> {
    try {
      // Exchange authorization code for access token
      const response = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code: authorizationCode,
      }) as OAuthTokenResponse;

      const {
        stripe_user_id,
        access_token,
        refresh_token,
        stripe_publishable_key,
      } = response;

      // Get account details
      const account = await stripe.accounts.retrieve(stripe_user_id);

      // Update merchant with Stripe Connect details
      const merchant = await db.update<Merchant>('merchants', merchantId, {
        stripe_account_id: stripe_user_id,
        stripe_onboarding_complete: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        status: account.charges_enabled ? 'active' : 'pending_verification',
      } as any);

      return {
        stripe_account_id: stripe_user_id,
        onboarding_complete: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        merchant_status: merchant.status,
      };
    } catch (error) {
      console.error('Stripe Connect callback error:', error);
      throw new AppError(
        'Failed to complete Stripe Connect onboarding',
        400,
        'STRIPE_CONNECT_ERROR'
      );
    }
  }

  /**
   * Get Stripe Connect account status
   */
  async getAccountStatus(merchantId: string): Promise<AccountStatusResponse> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (!merchant.stripe_account_id) {
      return {
        connected: false,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
      };
    }

    try {
      // Get latest account status from Stripe
      const account = await stripe.accounts.retrieve(merchant.stripe_account_id);

      // Update merchant with latest status
      await db.update<Merchant>('merchants', merchantId, {
        stripe_onboarding_complete: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
      } as any);

      return {
        connected: true,
        stripe_account_id: merchant.stripe_account_id,
        onboarding_complete: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        requirements: account.requirements,
        country: account.country,
        default_currency: account.default_currency,
      };
    } catch (error) {
      console.error('Error fetching Stripe account:', error);
      throw new AppError(
        'Failed to fetch Stripe account status',
        500,
        'STRIPE_ERROR'
      );
    }
  }

  /**
   * Create account link for Express Dashboard
   */
  async createAccountLink(
    merchantId: string,
    type: Stripe.AccountLinkCreateParams.Type = 'account_onboarding'
  ): Promise<AccountLinkResponse> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (!merchant.stripe_account_id) {
      throw new AppError(
        'Stripe account not connected. Please complete OAuth flow first.',
        400,
        'STRIPE_NOT_CONNECTED'
      );
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: merchant.stripe_account_id,
        refresh_url: `${process.env.APP_URL}/dashboard/settings`,
        return_url: `${process.env.APP_URL}/dashboard`,
        type,
      });

      return {
        url: accountLink.url,
        expires_at: accountLink.expires_at,
      };
    } catch (error) {
      console.error('Error creating account link:', error);
      throw new AppError(
        'Failed to create Stripe account link',
        500,
        'STRIPE_ERROR'
      );
    }
  }

  /**
   * Disconnect Stripe account
   */
  async disconnectAccount(merchantId: string): Promise<DisconnectResponse> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (!merchant.stripe_account_id) {
      throw new AppError('No Stripe account connected', 400, 'STRIPE_NOT_CONNECTED');
    }

    try {
      // Deauthorize the connected account
      await stripe.oauth.deauthorize({
        client_id: process.env.STRIPE_CONNECT_CLIENT_ID || '',
        stripe_user_id: merchant.stripe_account_id,
      });

      // Update merchant
      await db.update<Merchant>('merchants', merchantId, {
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        status: 'pending_verification',
      } as any);

      return {
        success: true,
        message: 'Stripe account disconnected successfully',
      };
    } catch (error) {
      console.error('Error disconnecting Stripe account:', error);
      throw new AppError(
        'Failed to disconnect Stripe account',
        500,
        'STRIPE_ERROR'
      );
    }
  }

  /**
   * Get Stripe dashboard login link
   */
  async getDashboardLink(merchantId: string): Promise<DashboardLinkResponse> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (!merchant.stripe_account_id) {
      throw new AppError('No Stripe account connected', 400, 'STRIPE_NOT_CONNECTED');
    }

    try {
      const loginLink = await stripe.accounts.createLoginLink(
        merchant.stripe_account_id
      );

      return {
        url: loginLink.url,
        created: loginLink.created,
      };
    } catch (error) {
      console.error('Error creating dashboard login link:', error);
      throw new AppError(
        'Failed to create Stripe dashboard link',
        500,
        'STRIPE_ERROR'
      );
    }
  }
}

export default new StripeConnectService();
