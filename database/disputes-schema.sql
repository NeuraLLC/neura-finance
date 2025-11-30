-- ==============================================
-- DISPUTES SCHEMA
-- Handles chargebacks and disputes from Stripe
-- ==============================================

-- Disputes table
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id),

  -- Stripe references
  stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_charge_id VARCHAR(255) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),

  -- Dispute details
  amount INTEGER NOT NULL, -- amount disputed in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  reason VARCHAR(100) NOT NULL, -- fraudulent, unrecognized, duplicate, subscription_canceled, product_unacceptable, credit_not_processed, general
  status VARCHAR(50) NOT NULL, -- warning_needs_response, warning_under_review, warning_closed, needs_response, under_review, won, lost, accepted

  -- Network reason (from card network)
  network_reason_code VARCHAR(50),

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  evidence_due_by TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  closed_at TIMESTAMP,

  -- Evidence submitted
  evidence_submitted BOOLEAN DEFAULT FALSE,
  evidence_details JSONB DEFAULT '{}',

  -- Merchant notes
  merchant_notes TEXT,

  -- Metadata from Stripe
  metadata JSONB DEFAULT '{}',

  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dispute evidence files table
CREATE TABLE dispute_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

  -- File details
  evidence_type VARCHAR(100) NOT NULL, -- receipt, customer_communication, shipping_documentation, refund_policy, billing_agreement, cancellation_policy, customer_signature, service_documentation, duplicate_charge_documentation, uncategorized
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),

  -- Description
  description TEXT,

  -- Upload info
  uploaded_by VARCHAR(100), -- merchant_id or 'system'
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_disputes_merchant_id ON disputes(merchant_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_stripe_dispute_id ON disputes(stripe_dispute_id);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX idx_disputes_evidence_due_by ON disputes(evidence_due_by);
CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER disputes_updated_at_trigger
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_disputes_updated_at();

-- Comments for documentation
COMMENT ON TABLE disputes IS 'Stores all payment disputes and chargebacks from Stripe';
COMMENT ON TABLE dispute_evidence IS 'Stores evidence files uploaded by merchants to contest disputes';
COMMENT ON COLUMN disputes.status IS 'warning_needs_response: early warning, needs_response: formal dispute requiring response, under_review: submitted and being reviewed, won: merchant won, lost: merchant lost, accepted: merchant accepted defeat';
COMMENT ON COLUMN disputes.reason IS 'Stripe dispute reason: fraudulent, unrecognized, duplicate, subscription_canceled, product_unacceptable, credit_not_processed, general';
