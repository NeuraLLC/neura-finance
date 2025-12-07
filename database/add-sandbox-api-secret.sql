-- Add sandbox_api_secret column for separate test/production secrets

-- Step 1: Add the column
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS sandbox_api_secret VARCHAR(255);

-- Step 2: Generate sandbox secrets for existing merchants
UPDATE merchants
SET sandbox_api_secret = encode(gen_random_bytes(32), 'hex')
WHERE sandbox_api_secret IS NULL;

-- Step 3: Make it NOT NULL after populating
ALTER TABLE merchants
ALTER COLUMN sandbox_api_secret SET NOT NULL;

-- Verify the update
SELECT
  id,
  business_email,
  environment,
  LENGTH(api_secret) as prod_secret_length,
  LENGTH(sandbox_api_secret) as sandbox_secret_length,
  CASE
    WHEN api_secret IS NOT NULL AND sandbox_api_secret IS NOT NULL THEN '✓ Both secrets present'
    ELSE '✗ Missing secrets'
  END as status
FROM merchants
ORDER BY created_at DESC
LIMIT 10;
