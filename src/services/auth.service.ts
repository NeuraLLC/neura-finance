import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './database.service';
import { AppError } from '../middleware/errorHandler';
import { Merchant } from './merchants.service';
import stripeConnectService from './stripeConnect.service';
import posthogService from './posthog.service';
import emailService from './email.service';

interface TokenPayload {
  merchantId: string;
  email: string;
}

interface SignupResponse {
  accessToken: string;
  merchant: {
    id: string;
    business_name: string;
    business_email: string;
    business_type: string | null;
    status: string;
    environment: string;
  };
  api_credentials: {
    api_key: string;
    api_secret: string;
  };
  onboarding_url?: string;
  requires_onboarding: boolean;
}

interface LoginResponse {
  accessToken: string;
  merchant: {
    id: string;
    business_name: string;
    business_email: string;
    business_type: string | null;
    status: string;
    environment: string;
    stripe_onboarding_complete?: boolean;
  };
}

interface OAuthResponse {
  accessToken: string;
  merchant: {
    id: string;
    business_name: string;
    business_email: string;
    business_type: string | null;
    status: string;
    environment: string;
    stripe_onboarding_complete?: boolean;
  };
}

interface CurrentMerchantResponse {
  id: string;
  business_name: string;
  business_email: string;
  business_type: string | null;
  status: string;
  environment: string;
  stripe_onboarding_complete?: boolean;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  api_key?: string;
  webhook_url?: string;
  created_at?: string;
}

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(merchantId: string, email: string): string {
    return jwt.sign(
      { merchantId, email } as TokenPayload,
      process.env.JWT_SECRET || '',
      { expiresIn: '7d' }
    );
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Sign up new merchant with deferred onboarding
   */
  async signup(
    businessName: string,
    businessEmail: string,
    password: string,
    businessType: string | null = null,
    country: string = 'US'
  ): Promise<SignupResponse> {
    try {
      // Check if merchant already exists
      const existingMerchant = await db.findOne<Merchant>('merchants', {
        business_email: businessEmail,
      });

      if (existingMerchant) {
        posthogService.captureLog('Signup failed - merchant exists', 'warn', {
          merchantId: 'system',
          email: businessEmail,
        });
        throw new AppError('Merchant with this email already exists', 400, 'MERCHANT_EXISTS');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Generate API credentials
      const apiKey = `npk_live_${crypto.randomBytes(24).toString('hex')}`;
      const apiSecret = crypto.randomBytes(32).toString('hex');
      const apiSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');

      // Map country to currency
      const currencyMap: Record<string, string> = {
        'US': 'usd',
        'GB': 'gbp',
        'DE': 'eur',
        'FR': 'eur',
        'IT': 'eur',
        'ES': 'eur',
        'NL': 'eur',
        'BE': 'eur',
        'AT': 'eur',
        'IE': 'eur',
        'PT': 'eur',
      };

      const defaultCurrency = currencyMap[country] || 'usd';

      // Create merchant with pending status (must complete onboarding)
      const merchant = await db.insert<Merchant>('merchants', {
        business_name: businessName,
        business_email: businessEmail,
        business_type: businessType,
        password: hashedPassword,
        api_key: apiKey,
        api_secret: apiSecretHash,
        status: 'active',
        environment: 'sandbox',
        country,
        default_currency: defaultCurrency,
        stripe_onboarding_complete: false,
      });

      // Create Stripe Connect account and generate onboarding URL
      let onboardingUrl: string | undefined;
      try {
        // Create Stripe Express account
        await stripeConnectService.createCustomAccount(
          merchant.id,
          businessEmail,
          country
        );

        // Generate onboarding link
        const accountLinkResponse = await stripeConnectService.createAccountLink(
          merchant.id,
          'account_onboarding'
        );

        onboardingUrl = accountLinkResponse.url;

        console.log('Stripe account created and onboarding URL generated');
      } catch (error) {
        // Don't fail signup if Stripe account creation fails
        // User can set it up later via settings page
        console.error('Failed to create Stripe account during signup:', error);
      }

      // Generate JWT
      const accessToken = this.generateToken(merchant.id, merchant.business_email);

      // Track signup event
      posthogService.capture(merchant.id, 'merchant_signed_up', {
        business_type: businessType,
        country,
        currency: defaultCurrency,
      });

      // Send welcome email (non-blocking)
      emailService.sendWelcomeEmail(merchant).catch((error) => {
        console.error('Failed to send welcome email:', error);
        // Don't fail the signup if email fails
      });

      return {
        accessToken,
        merchant: {
          id: merchant.id,
          business_name: merchant.business_name,
          business_email: merchant.business_email,
          business_type: merchant.business_type,
          status: merchant.status,
          environment: merchant.environment,
        },
        api_credentials: {
          api_key: apiKey,
          api_secret: apiSecret, // Only shown once
        },
        onboarding_url: onboardingUrl,
        requires_onboarding: true,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      posthogService.captureError(error as Error, {
        merchantId: 'system',
        email: businessEmail,
        action: 'signup',
      });
      throw error;
    }
  }

  /**
   * Login merchant
   */
  async login(businessEmail: string, password: string): Promise<LoginResponse> {
    try {
      // Find merchant
      const merchant = await db.findOne<Merchant>('merchants', {
        business_email: businessEmail,
      });

      if (!merchant) {
        posthogService.captureLog('Login failed - merchant not found', 'warn', {
          merchantId: 'system',
          email: businessEmail,
        });
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, merchant.password);

      if (!isPasswordValid) {
        posthogService.captureLog('Login failed - invalid password', 'warn', {
          merchantId: merchant.id,
          email: businessEmail,
        });
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check if merchant is active
      if (merchant.status === 'suspended') {
        posthogService.captureLog('Login failed - account suspended', 'warn', {
          merchantId: merchant.id,
          email: businessEmail,
        });
        throw new AppError('Account is suspended', 403, 'ACCOUNT_SUSPENDED');
      }

      if (merchant.status === 'closed') {
        posthogService.captureLog('Login failed - account closed', 'warn', {
          merchantId: merchant.id,
          email: businessEmail,
        });
        throw new AppError('Account is closed', 403, 'ACCOUNT_CLOSED');
      }

      // Generate JWT
      const accessToken = this.generateToken(merchant.id, merchant.business_email);

      // Log successful login
      posthogService.captureLog('Merchant login successful', 'info', {
        merchantId: merchant.id,
        email: merchant.business_email,
      });

      return {
        accessToken,
        merchant: {
          id: merchant.id,
          business_name: merchant.business_name,
          business_email: merchant.business_email,
          business_type: merchant.business_type,
          status: merchant.status,
          environment: merchant.environment,
          stripe_onboarding_complete: merchant.stripe_onboarding_complete,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      posthogService.captureError(error as Error, {
        merchantId: 'system',
        email: businessEmail,
        action: 'login',
      });
      throw error;
    }
  }

  /**
   * Handle OAuth callback (Google, Apple, etc.)
   */
  async handleOAuthCallback(
    provider: string,
    oauthUserId: string,
    email: string,
    name?: string
  ): Promise<OAuthResponse> {
    // Check if merchant exists with this OAuth provider
    let merchant = await db.findOne<Merchant>('merchants', {
      oauth_provider: provider,
      oauth_user_id: oauthUserId,
    });

    // If not, check by email
    if (!merchant) {
      merchant = await db.findOne<Merchant>('merchants', {
        business_email: email,
      });

      // If found by email, link OAuth account
      if (merchant) {
        merchant = await db.update<Merchant>('merchants', merchant.id, {
          oauth_provider: provider,
          oauth_user_id: oauthUserId,
        });
      }
    }

    // If still no merchant, create new one
    if (!merchant) {
      const apiKey = `npk_live_${crypto.randomBytes(24).toString('hex')}`;
      const apiSecret = crypto.randomBytes(32).toString('hex');
      const apiSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');

      // Random password for OAuth users (they won't use it)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await this.hashPassword(randomPassword);

      merchant = await db.insert<Merchant>('merchants', {
        business_name: name || email.split('@')[0],
        business_email: email,
        password: hashedPassword,
        api_key: apiKey,
        api_secret: apiSecretHash,
        oauth_provider: provider,
        oauth_user_id: oauthUserId,
        status: 'active', // OAuth users are auto-verified
        environment: 'sandbox',
      });
    }

    // Generate JWT
    const accessToken = this.generateToken(merchant.id, merchant.business_email);

    return {
      accessToken,
      merchant: {
        id: merchant.id,
        business_name: merchant.business_name,
        business_email: merchant.business_email,
        business_type: merchant.business_type,
        status: merchant.status,
        environment: merchant.environment,
        stripe_onboarding_complete: merchant.stripe_onboarding_complete,
      },
    };
  }

  /**
   * Get current merchant
   */
  async getCurrentMerchant(merchantId: string): Promise<CurrentMerchantResponse> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    return {
      id: merchant.id,
      business_name: merchant.business_name,
      business_email: merchant.business_email,
      business_type: merchant.business_type,
      status: merchant.status,
      environment: merchant.environment,
      stripe_onboarding_complete: merchant.stripe_onboarding_complete,
      stripe_charges_enabled: merchant.stripe_charges_enabled,
      stripe_payouts_enabled: merchant.stripe_payouts_enabled,
      api_key: merchant.environment === 'sandbox' ? merchant.sandbox_api_key : merchant.api_key,
      webhook_url: merchant.webhook_url,
      created_at: merchant.created_at,
    };
  }
}

export default new AuthService();
