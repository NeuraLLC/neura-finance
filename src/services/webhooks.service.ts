import Stripe from 'stripe';
import crypto from 'crypto';
import db from './database.service';
import disputesService from './disputes.service';
import ledgerService from './ledger.service';
import posthogService from './posthog.service';
import { AppError } from '../middleware/errorHandler';
import { Merchant } from './merchants.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

interface Transaction {
  id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  stripe_payment_intent_id: string;
  stripe_charge_id?: string;
}

interface Webhook {
  id: string;
  merchant_id: string;
  event_type: string;
  payload: Record<string, any>;
  endpoint: string;
  status: string;
  http_status_code?: number;
  response_body?: string;
  sent_at?: string;
  failed_at?: string;
}

interface WebhookEventResponse {
  received: boolean;
  event_type: string;
}

interface WebhookPayload {
  transaction_id: string;
  amount: number;
  currency: string;
  payment_intent_id?: string;
  charge_id?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

class WebhooksService {
  /**
   * Handle Stripe webhook event
   */
  async handleStripeWebhook(signature: string, rawBody: string | Buffer): Promise<WebhookEventResponse> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'charge.dispute.created':
        await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.updated':
        await this.handleDisputeUpdated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.closed':
        await this.handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.funds_withdrawn':
        await this.handleDisputeFundsWithdrawn(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.funds_reinstated':
        await this.handleDisputeFundsReinstated(event.data.object as Stripe.Dispute);
        break;

      case 'identity.verification_session.verified':
        await this.handleIdentityVerified(event.data.object as any);
        break;

      case 'identity.verification_session.requires_input':
        await this.handleIdentityRequiresInput(event.data.object as any);
        break;

      case 'identity.verification_session.canceled':
        await this.handleIdentityCanceled(event.data.object as any);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true, event_type: event.type };
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transaction = await db.findOne<Transaction>('transactions', {
      stripe_payment_intent_id: paymentIntent.id,
    });

    if (!transaction) {
      console.error('Transaction not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update transaction status
    await db.update<Transaction>('transactions', transaction.id, {
      status: 'succeeded',
      succeeded_at: new Date().toISOString(),
      stripe_charge_id: paymentIntent.latest_charge as string,
      payment_method_details: paymentIntent.payment_method_types,
    } as any);

    // Send webhook to merchant
    await this.sendMerchantWebhook(
      transaction.merchant_id,
      'payment.succeeded',
      {
        transaction_id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_intent_id: paymentIntent.id,
      }
    );

    console.log('Payment succeeded:', transaction.id);

    // Deferred Payment Logic
    if (paymentIntent.metadata?.type === 'deferred_payment') {
      const merchantId = paymentIntent.metadata.merchant_id;
      if (merchantId) {
        await ledgerService.addEntry(
          merchantId,
          'credit',
          paymentIntent.amount,
          paymentIntent.currency,
          `Payment ${paymentIntent.id}`,
          'pending',
          { payment_intent_id: paymentIntent.id }
        );
        console.log('Added pending ledger entry for:', paymentIntent.id);
      }
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transaction = await db.findOne<Transaction>('transactions', {
      stripe_payment_intent_id: paymentIntent.id,
    });

    if (!transaction) {
      console.error('Transaction not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update transaction status
    await db.update<Transaction>('transactions', transaction.id, {
      status: 'failed',
      failed_at: new Date().toISOString(),
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message,
    } as any);

    // Send webhook to merchant
    await this.sendMerchantWebhook(
      transaction.merchant_id,
      'payment.failed',
      {
        transaction_id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_intent_id: paymentIntent.id,
        error: {
          code: paymentIntent.last_payment_error?.code,
          message: paymentIntent.last_payment_error?.message,
        },
      }
    );

    console.log('Payment failed:', transaction.id);
  }

  /**
   * Handle canceled payment
   */
  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transaction = await db.findOne<Transaction>('transactions', {
      stripe_payment_intent_id: paymentIntent.id,
    });

    if (!transaction) {
      console.error('Transaction not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update transaction status
    await db.update<Transaction>('transactions', transaction.id, {
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    } as any);

    // Send webhook to merchant
    await this.sendMerchantWebhook(
      transaction.merchant_id,
      'payment.canceled',
      {
        transaction_id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_intent_id: paymentIntent.id,
      }
    );

    console.log('Payment canceled:', transaction.id);
  }

  /**
   * Handle charge refunded
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    // Find transaction by charge ID
    const transaction = await db.findOne<Transaction>('transactions', {
      stripe_charge_id: charge.id,
    });

    if (!transaction) {
      console.error('Transaction not found for charge:', charge.id);
      return;
    }

    // Debit Ledger for Refund
    await ledgerService.addEntry(
      transaction.merchant_id,
      'debit',
      charge.amount_refunded,
      transaction.currency,
      `Refund for ${charge.id}`,
      'available',
      { charge_id: charge.id }
    );

    // Send webhook to merchant
    await this.sendMerchantWebhook(
      transaction.merchant_id,
      'payment.refunded',
      {
        transaction_id: transaction.id,
        amount: charge.amount_refunded,
        currency: transaction.currency,
        charge_id: charge.id,
      }
    );

    console.log('Charge refunded:', transaction.id);
  }

  /**
   * Handle Stripe Connect account updated (with deferred onboarding support)
   */
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    // Find merchant by Stripe account ID
    const merchant = await db.findOne<Merchant>('merchants', {
      stripe_account_id: account.id,
    });

    if (!merchant) {
      console.error('Merchant not found for Stripe account:', account.id);
      return;
    }

    // Check if merchant just became verified (transition from unverified to verified)
    const wasNotVerified = !merchant.stripe_charges_enabled || !merchant.stripe_payouts_enabled;
    const isNowVerified = account.charges_enabled && account.payouts_enabled;

    // Update merchant status
    await db.update<Merchant>('merchants', merchant.id, {
      stripe_onboarding_complete: account.details_submitted,
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
    } as any);

    console.log('Stripe account updated:', merchant.id, {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });

    // Handle deferred onboarding completion
    if (wasNotVerified && isNowVerified && merchant.deferred_onboarding_enabled) {
      console.log('🎉 Merchant completed deferred onboarding, releasing funds:', merchant.id);

      // Get pending balance
      const balance = await ledgerService.getBalance(merchant.id);

      if (balance.pending > 0) {
        console.log(`Releasing ${balance.pending / 100} ${balance.currency} in pending funds`);

        // Release pending funds to available
        await ledgerService.releaseFunds(merchant.id);

        // Transfer funds to merchant account
        try {
          const transfer = await stripe.transfers.create({
            amount: balance.pending,
            currency: balance.currency,
            destination: account.id,
            description: `Transfer of ${(balance.pending / 100).toFixed(2)} ${balance.currency.toUpperCase()} from ${merchant.earnings_count || 0} deferred payments`,
            metadata: {
              merchant_id: merchant.id,
              type: 'deferred_onboarding_completion',
              earnings_count: String(merchant.earnings_count || 0),
            },
          });

          console.log('✅ Successfully transferred pending funds:', {
            transfer_id: transfer.id,
            amount: balance.pending,
            currency: balance.currency,
          });

          // Update payout schedule to automatic (daily)
          await stripe.accounts.update(account.id, {
            settings: {
              payouts: {
                schedule: {
                  interval: 'daily',
                },
              },
            },
          });

          console.log('✅ Updated payout schedule to daily for merchant:', merchant.id);

          // Track event
          posthogService.capture(merchant.id, 'deferred_onboarding_completed', {
            pending_amount: balance.pending,
            earnings_count: merchant.earnings_count,
            transfer_id: transfer.id,
            currency: balance.currency,
          });
        } catch (error) {
          console.error('❌ Error transferring funds after onboarding:', error);
          // TODO: Implement retry logic via failed_transfers table
          // For now, funds remain in available balance and can be manually transferred
        }
      } else {
        console.log('No pending funds to transfer for merchant:', merchant.id);

        // Still update payout schedule even if no pending funds
        try {
          await stripe.accounts.update(account.id, {
            settings: {
              payouts: {
                schedule: {
                  interval: 'daily',
                },
              },
            },
          });
          console.log('✅ Updated payout schedule to daily (no pending funds)');
        } catch (error) {
          console.error('Error updating payout schedule:', error);
        }
      }
    } else if (isNowVerified && !merchant.deferred_onboarding_enabled) {
      // Legacy flow: Just release funds without transfer
      await ledgerService.releaseFunds(merchant.id);
      console.log('Released funds for merchant (legacy flow):', merchant.id);
    }
  }

  /**
   * Send webhook to merchant
   */
  private async sendMerchantWebhook(
    merchantId: string,
    eventType: string,
    payload: WebhookPayload
  ): Promise<void> {
    const merchant = await db.findById<Merchant>('merchants', merchantId);

    if (!merchant || !merchant.webhook_url) {
      console.log('No webhook URL configured for merchant:', merchantId);
      return;
    }

    // Create webhook record
    const webhook = await db.insert<Webhook>('webhooks', {
      merchant_id: merchantId,
      event_type: eventType,
      payload,
      endpoint: merchant.webhook_url,
      status: 'pending',
    });

    // Send webhook (in production, this should be queued)
    try {
      const timestamp = Date.now();
      const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', merchant.webhook_secret || '')
        .update(signaturePayload)
        .digest('hex');

      const response = await fetch(merchant.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NeuraPay-Signature': signature,
          'X-NeuraPay-Timestamp': timestamp.toString(),
          'X-NeuraPay-Event': eventType,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      await db.update<Webhook>('webhooks', webhook.id, {
        status: response.ok ? 'sent' : 'failed',
        http_status_code: response.status,
        response_body: responseText,
        sent_at: new Date().toISOString(),
      } as any);

      console.log('Webhook sent to merchant:', merchantId, eventType, response.status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send webhook:', errorMessage);

      await db.update<Webhook>('webhooks', webhook.id, {
        status: 'failed',
        failed_at: new Date().toISOString(),
        response_body: errorMessage,
      } as any);
    }
  }

  /**
   * Handle dispute created
   */
  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Find merchant by charge ID
      const transaction = await db.findOne<Transaction>('transactions', {
        stripe_charge_id: dispute.charge as string,
      });

      if (!transaction) {
        console.error('Transaction not found for dispute charge:', dispute.charge);
        return;
      }

      // Create dispute record
      await disputesService.createDisputeFromStripe(dispute, transaction.merchant_id);

      // Send webhook to merchant
      await this.sendMerchantWebhook(
        transaction.merchant_id,
        'dispute.created',
        {
          transaction_id: transaction.id,
          amount: dispute.amount,
          currency: dispute.currency,
          dispute_id: dispute.id,
          reason: dispute.reason,
          status: dispute.status,
          evidence_due_by: new Date(dispute.evidence_details.due_by! * 1000).toISOString(),
        } as any
      );

      console.log('Dispute created:', dispute.id);
    } catch (error) {
      console.error('Error handling dispute created:', error);
    }
  }

  /**
   * Handle dispute updated
   */
  private async handleDisputeUpdated(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Update dispute record
      await disputesService.updateDisputeFromStripe(dispute);

      // Find merchant
      const localDispute = await disputesService.getDisputeByStripeId(dispute.id);
      if (!localDispute) {
        console.error('Dispute not found in database:', dispute.id);
        return;
      }

      // Send webhook to merchant
      await this.sendMerchantWebhook(
        localDispute.merchant_id,
        'dispute.updated',
        {
          transaction_id: localDispute.transaction_id,
          amount: dispute.amount,
          currency: dispute.currency,
          dispute_id: dispute.id,
          status: dispute.status,
        } as any
      );

      console.log('Dispute updated:', dispute.id);
    } catch (error) {
      console.error('Error handling dispute updated:', error);
    }
  }

  /**
   * Handle dispute closed
   */
  private async handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Update dispute record
      await disputesService.updateDisputeFromStripe(dispute);

      // Find merchant
      const localDispute = await disputesService.getDisputeByStripeId(dispute.id);
      if (!localDispute) {
        console.error('Dispute not found in database:', dispute.id);
        return;
      }

      // Send webhook to merchant
      await this.sendMerchantWebhook(
        localDispute.merchant_id,
        'dispute.closed',
        {
          transaction_id: localDispute.transaction_id,
          amount: dispute.amount,
          currency: dispute.currency,
          dispute_id: dispute.id,
          status: dispute.status,
          outcome: dispute.status === 'won' ? 'won' : 'lost',
        } as any
      );

      console.log('Dispute closed:', dispute.id, 'Status:', dispute.status);
    } catch (error) {
      console.error('Error handling dispute closed:', error);
    }
  }

  /**
   * Handle dispute funds withdrawn
   */
  private async handleDisputeFundsWithdrawn(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Find merchant
      const localDispute = await disputesService.getDisputeByStripeId(dispute.id);
      if (!localDispute) {
        console.error('Dispute not found in database:', dispute.id);
        return;
      }

      // Debit Ledger for Dispute
      await ledgerService.addEntry(
        localDispute.merchant_id,
        'debit',
        dispute.amount,
        dispute.currency,
        `Dispute funds withdrawn ${dispute.id}`,
        'available',
        { dispute_id: dispute.id }
      );

      // Send webhook to merchant
      await this.sendMerchantWebhook(
        localDispute.merchant_id,
        'dispute.funds_withdrawn',
        {
          transaction_id: localDispute.transaction_id,
          amount: dispute.amount,
          currency: dispute.currency,
          dispute_id: dispute.id,
        } as any
      );

      console.log('Dispute funds withdrawn:', dispute.id);
    } catch (error) {
      console.error('Error handling dispute funds withdrawn:', error);
    }
  }

  /**
   * Handle dispute funds reinstated
   */
  private async handleDisputeFundsReinstated(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Find merchant
      const localDispute = await disputesService.getDisputeByStripeId(dispute.id);
      if (!localDispute) {
        console.error('Dispute not found in database:', dispute.id);
        return;
      }

      // Credit Ledger for Reinstated Funds
      await ledgerService.addEntry(
        localDispute.merchant_id,
        'credit',
        dispute.amount,
        dispute.currency,
        `Dispute funds reinstated ${dispute.id}`,
        'available',
        { dispute_id: dispute.id }
      );

      // Send webhook to merchant
      await this.sendMerchantWebhook(
        localDispute.merchant_id,
        'dispute.funds_reinstated',
        {
          transaction_id: localDispute.transaction_id,
          amount: dispute.amount,
          currency: dispute.currency,
          dispute_id: dispute.id,
        } as any
      );

      console.log('Dispute funds reinstated:', dispute.id);
    } catch (error) {
      console.error('Error handling dispute funds reinstated:', error);
    }
  }

  /**
   * Handle identity verification verified
   */
  private async handleIdentityVerified(session: any): Promise<void> {
    try {
      // The metadata should contain the merchant_id that we set when creating the session
      const merchantId = session.metadata?.merchant_id;
      
      if (!merchantId) {
        console.error('No merchant_id in identity verification session metadata');
        return;
      }

      // Update merchant record
      await db.update<Merchant>('merchants', merchantId, {
        identity_verification_status: 'verified',
        identity_verification_session_id: session.id,
        identity_verified_at: new Date().toISOString(),
      } as any);

      console.log('Identity verified for merchant:', merchantId);
    } catch (error) {
      console.error('Error handling identity verified:', error);
    }
  }

  /**
   * Handle identity verification requires input
   */
  private async handleIdentityRequiresInput(session: any): Promise<void> {
    try {
      const merchantId = session.metadata?.merchant_id;
      
      if (!merchantId) {
        console.error('No merchant_id in identity verification session metadata');
        return;
      }

      // Update merchant record
      await db.update<Merchant>('merchants', merchantId, {
        identity_verification_status: 'requires_input',
        identity_verification_session_id: session.id,
      } as any);

      console.log('Identity verification requires input for merchant:', merchantId);
      // TODO: Send notification to merchant to upload required documents
    } catch (error) {
      console.error('Error handling identity requires input:', error);
    }
  }

  /**
   * Handle identity verification canceled
   */
  private async handleIdentityCanceled(session: any): Promise<void> {
    try {
      const merchantId = session.metadata?.merchant_id;
      
      if (!merchantId) {
        console.error('No merchant_id in identity verification session metadata');
        return;
      }

      // Update merchant record
      await db.update<Merchant>('merchants', merchantId, {
        identity_verification_status: 'canceled',
        identity_verification_session_id: session.id,
      } as any);

      console.log('Identity verification canceled for merchant:', merchantId);
    } catch (error) {
      console.error('Error handling identity canceled:', error);
    }
  }
}

export default new WebhooksService();
