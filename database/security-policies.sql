-- ==============================================
-- COMPLETE ROW LEVEL SECURITY POLICIES
-- Secure all tables with proper RLS policies
-- ==============================================

-- ==============================================
-- MERCHANTS TABLE
-- ==============================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own profile
CREATE POLICY "Merchants can view own profile"
ON merchants
FOR SELECT
USING (id = auth.uid());

-- Service role can view all merchants
CREATE POLICY "Service role can view all merchants"
ON merchants
FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');

-- Merchants can update their own profile
CREATE POLICY "Merchants can update own profile"
ON merchants
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Service role can update all merchants
CREATE POLICY "Service role can update all merchants"
ON merchants
FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role');

-- Only service role can insert merchants (signup flow)
CREATE POLICY "Service role can insert merchants"
ON merchants
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- No one can delete merchants (soft delete only)
CREATE POLICY "No deletion of merchants"
ON merchants
FOR DELETE
USING (false);

-- ==============================================
-- TRANSACTIONS TABLE
-- ==============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own transactions
CREATE POLICY "Merchants can view own transactions"
ON transactions
FOR SELECT
USING (merchant_id = auth.uid());

-- Service role can view all transactions
CREATE POLICY "Service role can view all transactions"
ON transactions
FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');

-- Only service role can modify transactions
CREATE POLICY "Service role can manage transactions"
ON transactions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ==============================================
-- CUSTOMERS TABLE
-- ==============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own customers
CREATE POLICY "Merchants can view own customers"
ON customers
FOR SELECT
USING (merchant_id = auth.uid());

-- Service role can view all customers
CREATE POLICY "Service role can view all customers"
ON customers
FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');

-- Only service role can modify customers
CREATE POLICY "Service role can manage customers"
ON customers
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ==============================================
-- REFUNDS TABLE
-- ==============================================

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own refunds
CREATE POLICY "Merchants can view own refunds"
ON refunds
FOR SELECT
USING (
  transaction_id IN (
    SELECT id FROM transactions WHERE merchant_id = auth.uid()
  )
);

-- Service role can view all refunds
CREATE POLICY "Service role can view all refunds"
ON refunds
FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');

-- Only service role can manage refunds
CREATE POLICY "Service role can manage refunds"
ON refunds
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ==============================================
-- PAYMENT LINKS TABLE
-- ==============================================

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own payment links
CREATE POLICY "Merchants can view own payment links"
ON payment_links
FOR SELECT
USING (merchant_id = auth.uid());

-- Merchants can create payment links
CREATE POLICY "Merchants can create payment links"
ON payment_links
FOR INSERT
WITH CHECK (merchant_id = auth.uid());

-- Merchants can update their own payment links
CREATE POLICY "Merchants can update own payment links"
ON payment_links
FOR UPDATE
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role can manage payment links"
ON payment_links
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ==============================================
-- WEBHOOKS TABLE
-- ==============================================

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own webhooks
CREATE POLICY "Merchants can view own webhooks"
ON webhooks
FOR SELECT
USING (merchant_id = auth.uid());

-- Service role can manage all webhooks
CREATE POLICY "Service role can manage webhooks"
ON webhooks
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ==============================================
-- API KEYS TABLE
-- ==============================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own API keys
CREATE POLICY "Merchants can view own API keys"
ON api_keys
FOR SELECT
USING (merchant_id = auth.uid());

-- Merchants can create their own API keys
CREATE POLICY "Merchants can create API keys"
ON api_keys
FOR INSERT
WITH CHECK (merchant_id = auth.uid());

-- Merchants can update their own API keys (e.g., revoke, rename)
CREATE POLICY "Merchants can update own API keys"
ON api_keys
FOR UPDATE
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

-- Service role can manage all API keys
CREATE POLICY "Service role can manage API keys"
ON api_keys
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- No one can delete API keys (soft delete via is_active flag)
CREATE POLICY "No deletion of API keys"
ON api_keys
FOR DELETE
USING (false);

-- ==============================================
-- MERCHANT REVENUE SUMMARY VIEW
-- Fix security definer issue
-- ==============================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS merchant_revenue_summary;

-- Recreate view with SECURITY INVOKER (not SECURITY DEFINER)
CREATE VIEW merchant_revenue_summary
WITH (security_invoker = true)
AS
SELECT
  m.id as merchant_id,
  m.business_name,
  m.business_email,
  COUNT(t.id) as total_transactions,
  COUNT(CASE WHEN t.status = 'succeeded' THEN 1 END) as successful_transactions,
  COALESCE(SUM(CASE WHEN t.status = 'succeeded' THEN t.amount ELSE 0 END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN r.amount ELSE 0 END), 0) as total_refunded,
  COALESCE(SUM(CASE WHEN t.status = 'succeeded' THEN t.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN r.amount ELSE 0 END), 0) as net_revenue
FROM merchants m
LEFT JOIN transactions t ON m.id = t.merchant_id
LEFT JOIN refunds r ON t.id = r.transaction_id AND r.status = 'succeeded'
GROUP BY m.id, m.business_name, m.business_email;

-- Grant access to authenticated users
GRANT SELECT ON merchant_revenue_summary TO authenticated;

-- RLS for the view (applies underlying table policies)
ALTER VIEW merchant_revenue_summary SET (security_invoker = true);

-- ==============================================
-- GRANT STATEMENTS
-- ==============================================

-- Grant authenticated users appropriate access
GRANT SELECT ON merchants TO authenticated;
GRANT SELECT ON transactions TO authenticated;
GRANT SELECT ON customers TO authenticated;
GRANT SELECT ON refunds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_links TO authenticated;
GRANT SELECT ON webhooks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON api_keys TO authenticated;

-- Grant service role full access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ==============================================
-- VERIFY RLS IS ENABLED
-- ==============================================

-- Query to check which tables have RLS enabled
-- Run this to verify:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- ==============================================
-- COMMENTS
-- ==============================================

COMMENT ON POLICY "Merchants can view own profile" ON merchants IS
  'Ensures merchants can only see their own merchant profile data';

COMMENT ON POLICY "Merchants can view own transactions" ON transactions IS
  'Restricts transaction data to the merchant who owns it';

COMMENT ON POLICY "No deletion of merchants" ON merchants IS
  'Prevents deletion of merchant records to maintain data integrity. Use soft delete (is_active flag) instead';

COMMENT ON POLICY "No deletion of API keys" ON api_keys IS
  'Prevents deletion of API keys to maintain audit trail. Use is_active flag for soft delete instead';

COMMENT ON VIEW merchant_revenue_summary IS
  'Provides revenue analytics per merchant with RLS applied via underlying table policies';
