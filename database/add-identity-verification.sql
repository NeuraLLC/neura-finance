-- Migration: Add identity verification fields to merchants table

ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS identity_verification_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS identity_verification_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for verification status
ALTER TABLE merchants 
DROP CONSTRAINT IF EXISTS valid_identity_verification_status;

ALTER TABLE merchants 
ADD CONSTRAINT valid_identity_verification_status 
CHECK (identity_verification_status IN ('pending', 'requires_input', 'verified', 'canceled'));

-- Create index for faster verification status lookups
CREATE INDEX IF NOT EXISTS idx_merchants_identity_verification_status 
ON merchants(identity_verification_status);
