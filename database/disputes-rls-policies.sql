-- ==============================================
-- ROW LEVEL SECURITY POLICIES FOR DISPUTES
-- Ensures merchants can only access their own dispute data
-- ==============================================

-- Enable Row Level Security on disputes table
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on dispute_evidence table
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- DISPUTES TABLE POLICIES
-- ==============================================

-- Policy: Merchants can view their own disputes
CREATE POLICY "Merchants can view own disputes"
ON disputes
FOR SELECT
USING (
  merchant_id = auth.uid()
  OR
  merchant_id IN (
    SELECT id FROM merchants WHERE id = auth.uid()
  )
);

-- Policy: Service role can view all disputes (for backend operations)
CREATE POLICY "Service role can view all disputes"
ON disputes
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy: Merchants can update their own disputes (for notes, etc)
CREATE POLICY "Merchants can update own disputes"
ON disputes
FOR UPDATE
USING (
  merchant_id = auth.uid()
  OR
  merchant_id IN (
    SELECT id FROM merchants WHERE id = auth.uid()
  )
)
WITH CHECK (
  merchant_id = auth.uid()
  OR
  merchant_id IN (
    SELECT id FROM merchants WHERE id = auth.uid()
  )
);

-- Policy: Only backend service can insert disputes (from webhooks)
CREATE POLICY "Service role can insert disputes"
ON disputes
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy: Service role can update all disputes (from webhooks)
CREATE POLICY "Service role can update all disputes"
ON disputes
FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy: No one can delete disputes (audit trail)
CREATE POLICY "No deletion of disputes"
ON disputes
FOR DELETE
USING (false);

-- ==============================================
-- DISPUTE EVIDENCE TABLE POLICIES
-- ==============================================

-- Policy: Merchants can view evidence for their own disputes
CREATE POLICY "Merchants can view own dispute evidence"
ON dispute_evidence
FOR SELECT
USING (
  dispute_id IN (
    SELECT id FROM disputes WHERE merchant_id = auth.uid()
  )
);

-- Policy: Service role can view all evidence
CREATE POLICY "Service role can view all evidence"
ON dispute_evidence
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy: Merchants can insert evidence for their own disputes
CREATE POLICY "Merchants can insert own dispute evidence"
ON dispute_evidence
FOR INSERT
WITH CHECK (
  dispute_id IN (
    SELECT id FROM disputes WHERE merchant_id = auth.uid()
  )
);

-- Policy: Service role can insert all evidence
CREATE POLICY "Service role can insert all evidence"
ON dispute_evidence
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy: Merchants can update their own evidence
CREATE POLICY "Merchants can update own evidence"
ON dispute_evidence
FOR UPDATE
USING (
  dispute_id IN (
    SELECT id FROM disputes WHERE merchant_id = auth.uid()
  )
);

-- Policy: Service role can update all evidence
CREATE POLICY "Service role can update all evidence"
ON dispute_evidence
FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy: Merchants can delete their own evidence (before submission)
CREATE POLICY "Merchants can delete own evidence"
ON dispute_evidence
FOR DELETE
USING (
  dispute_id IN (
    SELECT id FROM disputes
    WHERE merchant_id = auth.uid()
    AND evidence_submitted = false
  )
);

-- Policy: Service role can delete all evidence
CREATE POLICY "Service role can delete all evidence"
ON dispute_evidence
FOR DELETE
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant authenticated users access to tables
GRANT SELECT, INSERT, UPDATE ON disputes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dispute_evidence TO authenticated;

-- Grant service role full access
GRANT ALL ON disputes TO service_role;
GRANT ALL ON dispute_evidence TO service_role;

-- Grant anon role read access (for public webhooks if needed)
GRANT SELECT ON disputes TO anon;
GRANT SELECT ON dispute_evidence TO anon;

-- ==============================================
-- ADDITIONAL SECURITY POLICIES
-- ==============================================

-- Policy: Prevent viewing disputes from other merchants (backup security)
CREATE POLICY "Block cross-merchant dispute access"
ON disputes
FOR ALL
USING (
  CASE
    WHEN auth.jwt() ->> 'role' = 'service_role' THEN true
    WHEN auth.jwt() ->> 'role' = 'authenticated' THEN
      merchant_id = auth.uid()
    ELSE false
  END
);

-- ==============================================
-- COMMENTS
-- ==============================================

COMMENT ON POLICY "Merchants can view own disputes" ON disputes IS
  'Allows merchants to view only their own disputes';

COMMENT ON POLICY "Service role can view all disputes" ON disputes IS
  'Allows backend service to access all disputes for webhook processing';

COMMENT ON POLICY "No deletion of disputes" ON disputes IS
  'Prevents deletion of disputes to maintain audit trail';
