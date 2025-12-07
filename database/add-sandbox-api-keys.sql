-- Add sandbox API keys to existing merchants who don't have one
-- Run this migration to update existing user accounts

UPDATE merchants
SET sandbox_api_key = 'npk_test_' || encode(gen_random_bytes(24), 'hex')
WHERE sandbox_api_key IS NULL
  AND api_key IS NOT NULL
  AND api_secret IS NOT NULL;

-- Verify the update
SELECT
  id,
  business_email,
  api_key,
  sandbox_api_key,
  environment
FROM merchants
WHERE sandbox_api_key IS NOT NULL
ORDER BY created_at DESC;
