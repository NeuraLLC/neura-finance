-- NeuraPay Database Schema
-- PostgreSQL/Supabase Schema for Payment Service Provider

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MERCHANTS TABLE
-- Stores business information for clients using the PSP
-- =====================================================
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    business_email VARCHAR(255) NOT NULL UNIQUE,
    business_type VARCHAR(100), -- e.g., 'airline', 'bank', 'ecommerce'

    -- Stripe Connect
    stripe_account_id VARCHAR(255) UNIQUE, -- Stripe Connect account ID
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    stripe_charges_enabled BOOLEAN DEFAULT FALSE,
    stripe_payouts_enabled BOOLEAN DEFAULT FALSE,

    -- Authentication
    password VARCHAR(255) NOT NULL, -- Bcrypt hashed password for dashboard login
    api_key VARCHAR(255) NOT NULL UNIQUE, -- Production API key
    api_secret VARCHAR(255) NOT NULL, -- Production secret for HMAC
    sandbox_api_key VARCHAR(255) UNIQUE, -- Sandbox/test API key
    sandbox_api_secret VARCHAR(255), -- Sandbox secret for HMAC
    webhook_url VARCHAR(500), -- Merchant's webhook endpoint
    webhook_secret VARCHAR(255), -- For signing webhook payloads
    environment VARCHAR(50) DEFAULT 'sandbox', -- 'sandbox' or 'production'

    -- OAuth fields
    oauth_provider VARCHAR(50), -- 'google', 'apple', etc.
    oauth_user_id VARCHAR(255), -- OAuth provider's user ID

    -- Settings
    default_currency VARCHAR(3) DEFAULT 'USD',
    accepted_payment_methods JSONB DEFAULT '["card", "crypto"]'::jsonb,

    -- White-label settings
    brand_logo_url VARCHAR(500),
    brand_color VARCHAR(7), -- Hex color
    brand_name VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'pending_verification', -- pending_verification, active, suspended, closed
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending_verification', 'active', 'suspended', 'closed'))
);

-- Index for faster lookups
CREATE INDEX idx_merchants_api_key ON merchants(api_key);
CREATE INDEX idx_merchants_sandbox_api_key ON merchants(sandbox_api_key);
CREATE INDEX idx_merchants_stripe_account_id ON merchants(stripe_account_id);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_environment ON merchants(environment);
CREATE INDEX idx_merchants_oauth_provider ON merchants(oauth_provider);
CREATE INDEX idx_merchants_oauth_user_id ON merchants(oauth_user_id);

-- =====================================================
-- CUSTOMERS TABLE
-- End-users making payments to merchants
-- =====================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Customer info
    email VARCHAR(255),
    phone VARCHAR(50),
    name VARCHAR(255),

    -- Stripe
    stripe_customer_id VARCHAR(255), -- Stripe Customer ID

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(merchant_id, email)
);

CREATE INDEX idx_customers_merchant_id ON customers(merchant_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);

-- =====================================================
-- TRANSACTIONS TABLE
-- Core payment transaction records
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Payment details
    amount INTEGER NOT NULL, -- Amount in smallest currency unit (cents)
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,

    -- Payment method
    payment_method VARCHAR(50) NOT NULL, -- 'card', 'crypto'
    payment_method_details JSONB, -- Card last4, brand, crypto wallet, etc.

    -- Stripe
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending -> processing -> succeeded | failed | canceled
    -- succeeded -> refunded (partial or full)

    failure_code VARCHAR(100),
    failure_message TEXT,

    -- Idempotency
    idempotency_key VARCHAR(255) UNIQUE,

    -- Split payment tracking (for Stripe Connect)
    platform_fee INTEGER DEFAULT 0, -- Platform fee in smallest currency unit
    merchant_amount INTEGER, -- Amount merchant receives

    -- Processing timestamps
    pending_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_at TIMESTAMP WITH TIME ZONE,
    succeeded_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,

    -- Refund tracking
    refunded BOOLEAN DEFAULT FALSE,
    refunded_amount INTEGER DEFAULT 0,
    refunded_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
    CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Indexes for performance
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);
CREATE INDEX idx_transactions_stripe_payment_intent_id ON transactions(stripe_payment_intent_id);

-- Partition by created_at for better performance at scale (optional, enable when needed)
-- ALTER TABLE transactions PARTITION BY RANGE (created_at);

-- =====================================================
-- REFUNDS TABLE
-- Refund records linked to transactions
-- =====================================================
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Refund details
    amount INTEGER NOT NULL, -- Refund amount in smallest currency unit
    reason VARCHAR(255),

    -- Stripe
    stripe_refund_id VARCHAR(255) UNIQUE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, succeeded, failed

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_refund_status CHECK (status IN ('pending', 'succeeded', 'failed'))
);

CREATE INDEX idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX idx_refunds_merchant_id ON refunds(merchant_id);

-- =====================================================
-- PAYMENT_LINKS TABLE
-- White-labeled payment pages
-- =====================================================
CREATE TABLE payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Link details
    slug VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'checkout-abc123'
    amount INTEGER, -- NULL for variable amount
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,

    -- Settings
    allow_custom_amount BOOLEAN DEFAULT FALSE,
    min_amount INTEGER,
    max_amount INTEGER,

    -- Payment methods
    accepted_payment_methods JSONB DEFAULT '["card", "crypto"]'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration

    -- Usage tracking
    view_count INTEGER DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    total_collected INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_links_merchant_id ON payment_links(merchant_id);
CREATE INDEX idx_payment_links_slug ON payment_links(slug);
CREATE INDEX idx_payment_links_is_active ON payment_links(is_active);

-- =====================================================
-- WEBHOOKS TABLE
-- Webhook delivery logs for merchant notifications
-- =====================================================
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- e.g., 'payment.succeeded', 'payment.failed'
    payload JSONB NOT NULL,

    -- Delivery
    endpoint VARCHAR(500) NOT NULL,
    signature VARCHAR(500), -- HMAC signature

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed, retrying
    http_status_code INTEGER,
    response_body TEXT,

    -- Retry logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_webhook_status CHECK (status IN ('pending', 'sent', 'failed', 'retrying'))
);

CREATE INDEX idx_webhooks_merchant_id ON webhooks(merchant_id);
CREATE INDEX idx_webhooks_status ON webhooks(status);
CREATE INDEX idx_webhooks_next_retry_at ON webhooks(next_retry_at);
CREATE INDEX idx_webhooks_created_at ON webhooks(created_at DESC);

-- =====================================================
-- AUDIT_LOGS TABLE
-- Comprehensive audit trail for compliance
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,

    -- Actor
    actor_type VARCHAR(50), -- 'merchant', 'customer', 'system', 'admin'
    actor_id VARCHAR(255),

    -- Action
    action VARCHAR(100) NOT NULL, -- e.g., 'payment.created', 'refund.issued'
    resource_type VARCHAR(100), -- e.g., 'transaction', 'merchant'
    resource_id UUID,

    -- Details
    changes JSONB, -- Before/after snapshots
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Request info
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_merchant_id ON audit_logs(merchant_id);
CREATE INDEX idx_audit_logs_resource_type_id ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- API_KEYS TABLE (optional - for multiple keys per merchant)
-- =====================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Key details
    name VARCHAR(255), -- e.g., 'Production Server', 'Development'
    key VARCHAR(255) NOT NULL UNIQUE,
    secret_hash VARCHAR(255) NOT NULL, -- Bcrypt hash

    -- Permissions
    permissions JSONB DEFAULT '["read", "write"]'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration
);

CREATE INDEX idx_api_keys_merchant_id ON api_keys(merchant_id);
CREATE INDEX idx_api_keys_key ON api_keys(key);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_links_updated_at BEFORE UPDATE ON payment_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for multi-tenant isolation
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (customize based on your auth strategy)
-- Merchants can only see their own data
CREATE POLICY merchant_isolation_policy ON transactions
    FOR ALL
    USING (merchant_id = current_setting('app.current_merchant_id')::UUID);

-- Note: You'll need to set the merchant_id in session:
-- SET LOCAL app.current_merchant_id = 'merchant-uuid-here';

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Merchant revenue summary
CREATE OR REPLACE VIEW merchant_revenue_summary AS
SELECT
    m.id AS merchant_id,
    m.business_name,
    COUNT(t.id) AS total_transactions,
    COUNT(CASE WHEN t.status = 'succeeded' THEN 1 END) AS successful_transactions,
    SUM(CASE WHEN t.status = 'succeeded' THEN t.amount ELSE 0 END) AS total_revenue,
    SUM(CASE WHEN t.status = 'succeeded' THEN t.platform_fee ELSE 0 END) AS total_platform_fees,
    SUM(CASE WHEN t.refunded THEN t.refunded_amount ELSE 0 END) AS total_refunded
FROM merchants m
LEFT JOIN transactions t ON m.id = t.merchant_id
GROUP BY m.id, m.business_name;

-- =====================================================
-- SAMPLE DATA (for development)
-- =====================================================

-- Insert a test merchant (uncomment for development)
/*
INSERT INTO merchants (
    business_name,
    business_email,
    business_type,
    api_key,
    api_secret,
    status
) VALUES (
    'Test Airlines Inc.',
    'dev@testairlines.com',
    'airline',
    'npk_test_' || encode(gen_random_bytes(16), 'hex'),
    encode(digest('test_secret', 'sha256'), 'hex'),
    'active'
);
*/
