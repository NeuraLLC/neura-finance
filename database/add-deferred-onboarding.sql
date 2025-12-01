-- Migration: Add Deferred Onboarding Support
-- Description: Adds fields and tables to support Stripe Connect deferred onboarding
-- Author: Claude Code
-- Date: 2025-12-01

-- =============================================================================
-- Add new columns to merchants table for deferred onboarding
-- =============================================================================

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS deferred_onboarding_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarding_notification_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_notification_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_onboarding_notification_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS earnings_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_payment_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'usd';

-- Create index for finding merchants needing onboarding reminders
CREATE INDEX IF NOT EXISTS idx_merchants_deferred_onboarding
  ON merchants(deferred_onboarding_enabled, onboarding_notification_sent, earnings_count)
  WHERE deferred_onboarding_enabled = TRUE AND stripe_onboarding_complete = FALSE;

-- Create index for finding merchants approaching onboarding deadline
CREATE INDEX IF NOT EXISTS idx_merchants_onboarding_deadline
  ON merchants(first_payment_at, stripe_onboarding_complete)
  WHERE deferred_onboarding_enabled = TRUE AND stripe_onboarding_complete = FALSE;

-- =============================================================================
-- Create failed_transfers table for retry logic
-- =============================================================================

CREATE TABLE IF NOT EXISTS failed_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for failed_transfers
CREATE INDEX IF NOT EXISTS idx_failed_transfers_merchant_id ON failed_transfers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_failed_transfers_retry
  ON failed_transfers(next_retry_at, resolved)
  WHERE resolved = FALSE;

-- Add trigger for updated_at (assuming update_updated_at_column function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_failed_transfers_updated_at
        BEFORE UPDATE ON failed_transfers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS for failed_transfers
ALTER TABLE failed_transfers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Create notifications table for in-app notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_merchant_id
  ON notifications(merchant_id, read, created_at DESC);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON COLUMN merchants.deferred_onboarding_enabled IS 'Whether merchant is using deferred onboarding flow';
COMMENT ON COLUMN merchants.onboarding_notification_sent IS 'Whether initial onboarding reminder has been sent (after 3 payments)';
COMMENT ON COLUMN merchants.onboarding_notification_count IS 'Number of onboarding reminder notifications sent';
COMMENT ON COLUMN merchants.last_onboarding_notification_at IS 'Timestamp of last onboarding reminder';
COMMENT ON COLUMN merchants.earnings_count IS 'Number of successful payments received';
COMMENT ON COLUMN merchants.first_payment_at IS 'Timestamp of first successful payment (starts 30-day countdown)';
COMMENT ON COLUMN merchants.country IS 'Two-letter country code (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN merchants.default_currency IS 'Default currency for merchant based on country';

COMMENT ON TABLE failed_transfers IS 'Tracks failed Stripe transfers for retry mechanism';
COMMENT ON TABLE notifications IS 'In-app notifications for merchants';

-- =============================================================================
-- Migration complete
-- =============================================================================
