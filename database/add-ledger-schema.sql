-- Add balance fields to merchants
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0; -- Available balance in cents
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS pending_balance INTEGER DEFAULT 0; -- Pending balance in cents
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Create Ledger Entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'credit', 'debit'
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'available', 'failed'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_ledger_status CHECK (status IN ('pending', 'available', 'failed')),
    CONSTRAINT valid_ledger_type CHECK (type IN ('credit', 'debit'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_merchant_id ON ledger_entries(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_status ON ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ledger_entries_updated_at ON ledger_entries;
CREATE TRIGGER update_ledger_entries_updated_at BEFORE UPDATE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC to add ledger entry and update balance atomically
CREATE OR REPLACE FUNCTION add_ledger_entry(
    p_merchant_id UUID,
    p_type VARCHAR,
    p_amount INTEGER,
    p_currency VARCHAR,
    p_description TEXT,
    p_status VARCHAR,
    p_metadata JSONB
) RETURNS JSONB AS $$
DECLARE
    v_entry_id UUID;
    v_new_balance INTEGER;
    v_new_pending INTEGER;
BEGIN
    -- Insert Ledger Entry
    INSERT INTO ledger_entries (merchant_id, type, amount, currency, description, status, metadata)
    VALUES (p_merchant_id, p_type, p_amount, p_currency, p_description, p_status, p_metadata)
    RETURNING id INTO v_entry_id;

    -- Update Merchant Balance
    IF p_status = 'available' THEN
        UPDATE merchants
        SET balance = balance + (CASE WHEN p_type = 'credit' THEN p_amount ELSE -p_amount END)
        WHERE id = p_merchant_id
        RETURNING balance INTO v_new_balance;
    ELSIF p_status = 'pending' THEN
        UPDATE merchants
        SET pending_balance = pending_balance + (CASE WHEN p_type = 'credit' THEN p_amount ELSE -p_amount END)
        WHERE id = p_merchant_id
        RETURNING pending_balance INTO v_new_pending;
    END IF;

    RETURN jsonb_build_object(
        'entry_id', v_entry_id,
        'new_balance', v_new_balance,
        'new_pending', v_new_pending
    );
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on ledger_entries
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can only view their own ledger entries
CREATE POLICY "Merchants can view own ledger entries"
    ON ledger_entries
    FOR SELECT
    USING (merchant_id::TEXT = current_setting('app.current_merchant_id', true));

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role has full access to ledger entries"
    ON ledger_entries
    FOR ALL
    USING (current_setting('role', true) = 'service_role');
