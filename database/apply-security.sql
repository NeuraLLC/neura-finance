-- ==============================================
-- APPLY ALL SECURITY POLICIES
-- ==============================================
-- This script applies all RLS policies to secure the database
-- Run this in Supabase SQL Editor or via psql

-- 1. Apply dispute-specific RLS policies
\i disputes-rls-policies.sql

-- 2. Apply complete security policies for all tables
\i security-policies.sql

-- ==============================================
-- VERIFY RLS IS ENABLED
-- ==============================================

-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all active policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- EXPECTED RESULTS
-- ==============================================
-- All tables should show rowsecurity = TRUE
-- Expected tables with RLS:
-- - api_keys
-- - customers
-- - dispute_evidence
-- - disputes
-- - merchants
-- - payment_links
-- - refunds
-- - transactions
-- - webhooks
