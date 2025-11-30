-- ==============================================
-- ADD STRIPE FILE ID TO DISPUTE EVIDENCE TABLE
-- ==============================================
-- This migration adds stripe_file_id column to track uploaded files in Stripe

ALTER TABLE dispute_evidence
ADD COLUMN IF NOT EXISTS stripe_file_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_stripe_file_id ON dispute_evidence(stripe_file_id);

-- Add comment
COMMENT ON COLUMN dispute_evidence.stripe_file_id IS 'Stripe File ID returned from stripe.files.create(), used to reference file in evidence submission';

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'dispute_evidence'
  AND column_name = 'stripe_file_id';
