-- Migration: Convert hashed API secrets to plain text for HMAC verification
-- WARNING: This will regenerate all API secrets. Merchants will need to update their integrations.
-- Run this ONLY if you've communicated the change to all merchants.

-- Option 1: Regenerate secrets for all merchants (RECOMMENDED for production)
-- This ensures security - old secrets become invalid
UPDATE merchants
SET api_secret = encode(gen_random_bytes(32), 'hex')
WHERE api_secret IS NOT NULL;

-- Notify all merchants via email about API secret regeneration
-- You should send them their new secrets via a secure channel

-- Option 2: For development/testing only - keep existing secrets if they're already plain
-- (Skip this if you're in production)
-- If your existing secrets are hashed (64 chars hex), they need to be regenerated anyway
-- because you can't unhash them.

SELECT
  id,
  business_email,
  LENGTH(api_secret) as secret_length,
  CASE
    WHEN LENGTH(api_secret) = 64 THEN 'Likely hashed - needs regeneration'
    ELSE 'Plain text - OK for HMAC'
  END as status
FROM merchants
ORDER BY created_at DESC;
