-- Add branding column to merchants table for merchant customization
-- This allows merchants to customize payment links with their branding

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
  "logo_url": null,
  "primary_color": "#2563eb",
  "merchant_display_name": null,
  "default_currency": "usd",
  "payment_methods": ["card"]
}'::jsonb;

-- Add index for faster JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_merchants_branding ON merchants USING GIN (branding);

-- Add comment for documentation
COMMENT ON COLUMN merchants.branding IS 'Merchant branding configuration for payment links (logo, colors, display name, etc.)';
