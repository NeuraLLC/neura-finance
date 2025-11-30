-- ==============================================
-- VERIFY SECURITY POLICIES
-- ==============================================
-- Run these queries to verify RLS is properly configured

-- 1. Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS_Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: All tables should show rowsecurity = TRUE
-- Tables: api_keys, customers, dispute_evidence, disputes,
--         merchants, payment_links, refunds, transactions, webhooks

-- ==============================================

-- 2. List all active RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as "Command",
  qual as "USING Expression",
  with_check as "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================

-- 3. Check merchant_revenue_summary view security
SELECT
  viewname,
  definition
FROM pg_views
WHERE viewname = 'merchant_revenue_summary';

-- Expected: View should use security_invoker = true

-- ==============================================

-- 4. Check grants for authenticated role
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
ORDER BY table_name, privilege_type;

-- Expected grants for authenticated:
-- - merchants: SELECT
-- - transactions: SELECT
-- - customers: SELECT
-- - refunds: SELECT
-- - payment_links: SELECT, INSERT, UPDATE
-- - webhooks: SELECT
-- - api_keys: SELECT, INSERT, UPDATE
-- - disputes: SELECT
-- - dispute_evidence: SELECT

-- ==============================================

-- 5. Quick security summary
SELECT
  t.tablename,
  CASE WHEN t.rowsecurity THEN '✓ Enabled' ELSE '✗ DISABLED' END as "RLS Status",
  COUNT(p.policyname) as "Policy Count"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Expected: All tables should show "✓ Enabled" with at least 1 policy
