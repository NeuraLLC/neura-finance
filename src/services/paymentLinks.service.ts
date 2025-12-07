import crypto from 'crypto';
import db from './database.service';
import merchantsService from './merchants.service';
import { AppError } from '../middleware/errorHandler';

interface PaymentLink {
  id: string;
  merchant_id: string;
  slug: string;
  amount?: number | null;
  currency: string;
  description?: string;
  allow_custom_amount: boolean;
  min_amount?: number | null;
  max_amount?: number | null;
  accepted_payment_methods: string[];
  is_active: boolean;
  expires_at?: string | null;
  view_count: number;
  payment_count: number;
  total_collected: number;
  created_at?: string;
  updated_at?: string;
}

interface CreatePaymentLinkData {
  amount?: number;
  currency?: string;
  description?: string;
  allow_custom_amount?: boolean;
  min_amount?: number;
  max_amount?: number;
  expires_at?: string;
}

class PaymentLinksService {
  /**
   * Generate a unique slug for a payment link
   */
  private generateSlug(): string {
    return crypto.randomBytes(6).toString('hex');
  }

  /**
   * Create a payment link
   */
  async createPaymentLink(apiKey: string, data: CreatePaymentLinkData): Promise<PaymentLink> {
    // Validate merchant
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    const {
      amount,
      currency = 'usd',
      description,
      allow_custom_amount = false,
      min_amount,
      max_amount,
      expires_at,
    } = data;

    // Validate amount logic
    if (!allow_custom_amount && (!amount || amount <= 0)) {
      throw new AppError('Amount is required when custom amount is not allowed', 400, 'INVALID_AMOUNT');
    }

    if (allow_custom_amount) {
      if (min_amount && min_amount <= 0) {
        throw new AppError('Minimum amount must be greater than 0', 400, 'INVALID_MIN_AMOUNT');
      }
      if (max_amount && min_amount && max_amount < min_amount) {
        throw new AppError('Maximum amount must be greater than minimum amount', 400, 'INVALID_MAX_AMOUNT');
      }
    }

    // Generate unique slug
    let slug = this.generateSlug();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.findOne<PaymentLink>('payment_links', { slug });
      if (!existing) break;
      slug = this.generateSlug();
      attempts++;
    }

    if (attempts >= 10) {
      throw new AppError('Failed to generate unique slug', 500, 'SLUG_GENERATION_FAILED');
    }

    // Create payment link
    const paymentLink = await db.insert<PaymentLink>('payment_links', {
      merchant_id: merchant.id,
      slug,
      amount: allow_custom_amount ? null : amount,
      currency: currency.toLowerCase(),
      description,
      allow_custom_amount,
      min_amount: allow_custom_amount ? min_amount : null,
      max_amount: allow_custom_amount ? max_amount : null,
      accepted_payment_methods: ['card'],
      is_active: true,
      expires_at: expires_at || null,
      view_count: 0,
      payment_count: 0,
      total_collected: 0,
    });

    return paymentLink;
  }

  /**
   * Get payment link by slug (public)
   */
  async getPaymentLinkBySlug(slug: string): Promise<PaymentLink> {
    const paymentLink = await db.findOne<PaymentLink>('payment_links', { slug });

    if (!paymentLink) {
      throw new AppError('Payment link not found', 404, 'PAYMENT_LINK_NOT_FOUND');
    }

    // Check if active
    if (!paymentLink.is_active) {
      throw new AppError('Payment link is inactive', 400, 'PAYMENT_LINK_INACTIVE');
    }

    // Check if expired
    if (paymentLink.expires_at && new Date(paymentLink.expires_at) < new Date()) {
      throw new AppError('Payment link has expired', 400, 'PAYMENT_LINK_EXPIRED');
    }

    // Increment view count
    await db.getClient()
      .from('payment_links')
      .update({ view_count: paymentLink.view_count + 1 })
      .eq('id', paymentLink.id);

    return paymentLink;
  }

  /**
   * Get payment link by ID
   */
  async getPaymentLink(apiKey: string, linkId: string): Promise<PaymentLink> {
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    const paymentLink = await db.findById<PaymentLink>('payment_links', linkId);

    if (!paymentLink) {
      throw new AppError('Payment link not found', 404, 'PAYMENT_LINK_NOT_FOUND');
    }

    // Ensure link belongs to merchant
    if (paymentLink.merchant_id !== merchant.id) {
      throw new AppError('Payment link not found', 404, 'PAYMENT_LINK_NOT_FOUND');
    }

    return paymentLink;
  }

  /**
   * List payment links for merchant
   */
  async listPaymentLinks(
    apiKey: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaymentLink[]> {
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    const { limit = 10, offset = 0 } = options;

    const client = db.getClient();
    const { data: paymentLinks, error } = await client
      .from('payment_links')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    return paymentLinks || [];
  }

  /**
   * Update payment link
   */
  async updatePaymentLink(
    apiKey: string,
    linkId: string,
    updates: Partial<CreatePaymentLinkData>
  ): Promise<PaymentLink> {
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    const paymentLink = await db.findById<PaymentLink>('payment_links', linkId);

    if (!paymentLink) {
      throw new AppError('Payment link not found', 404, 'PAYMENT_LINK_NOT_FOUND');
    }

    // Ensure link belongs to merchant
    if (paymentLink.merchant_id !== merchant.id) {
      throw new AppError('Payment link not found', 404, 'PAYMENT_LINK_NOT_FOUND');
    }

    // Validate updates
    if (updates.allow_custom_amount !== undefined && !updates.allow_custom_amount) {
      if (!updates.amount && !paymentLink.amount) {
        throw new AppError('Amount is required when custom amount is disabled', 400, 'INVALID_AMOUNT');
      }
    }

    const updatedLink = await db.update<PaymentLink>('payment_links', linkId, updates);

    return updatedLink;
  }

  /**
   * Deactivate payment link
   */
  async deactivatePaymentLink(apiKey: string, linkId: string): Promise<void> {
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    const paymentLink = await db.findById<PaymentLink>('payment_links', linkId);

    if (!paymentLink) {
      throw new AppError('Payment link not found', 404, 'PAYMENT_LINK_NOT_FOUND');
    }

    // Ensure link belongs to merchant
    if (paymentLink.merchant_id !== merchant.id) {
      throw new AppError('Payment link not found', 404, 'PAYMENT_LINK_NOT_FOUND');
    }

    await db.update<PaymentLink>('payment_links', linkId, { is_active: false } as any);
  }

  /**
   * Record payment for a link
   */
  async recordPayment(linkId: string, amount: number): Promise<void> {
    const paymentLink = await db.findById<PaymentLink>('payment_links', linkId);

    if (!paymentLink) {
      return; // Silent fail
    }

    await db.getClient()
      .from('payment_links')
      .update({
        payment_count: paymentLink.payment_count + 1,
        total_collected: paymentLink.total_collected + amount,
      })
      .eq('id', linkId);
  }
}

export default new PaymentLinksService();
