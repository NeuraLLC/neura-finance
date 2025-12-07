-- Migration: Remove Deferred Onboarding Fields
-- Description: Removes deferred onboarding tracking fields from merchants table
-- Date: 2025-12-07
-- Reason: Switching to immediate verification flow (no deferred onboarding)

-- Remove deferred onboarding fields from merchants table
ALTER TABLE merchants
  DROP COLUMN IF EXISTS deferred_onboarding_enabled,
  DROP COLUMN IF EXISTS onboarding_notification_sent,
  DROP COLUMN IF EXISTS onboarding_notification_count,
  DROP COLUMN IF EXISTS last_onboarding_notification_at,
  DROP COLUMN IF EXISTS earnings_count,
  DROP COLUMN IF EXISTS first_payment_at;

-- Keep these fields as they're still useful:
-- - stripe_account_id (VARCHAR): Stripe Connect account ID
-- - stripe_onboarding_complete (BOOLEAN): Whether merchant completed verification
-- - stripe_charges_enabled (BOOLEAN): Whether charges are enabled
-- - stripe_payouts_enabled (BOOLEAN): Whether payouts are enabled
-- - country (VARCHAR): Merchant country code
-- - default_currency (VARCHAR): Merchant default currency

-- Note: Run this migration after deploying code changes that remove deferred onboarding logic
