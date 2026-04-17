-- ═══════════════════════════════════════════════════════════════════
--  MORE Express — Wallet & Customer Account Schema
--  Run this against your Supabase project after the existing tables.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add password, session & wallet fields to the existing `customer` table
-- ---------------------------------------------------------------
ALTER TABLE customer
  ADD COLUMN IF NOT EXISTS has_password        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_hash       text,                          -- store bcrypt hash in production
  ADD COLUMN IF NOT EXISTS session_token       text,                          -- random 64-char hex; issued on login
  ADD COLUMN IF NOT EXISTS session_expires_at  timestamptz,                   -- 30-day rolling expiry
  ADD COLUMN IF NOT EXISTS wallet_balance      numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_currency     varchar(10)   NOT NULL DEFAULT 'LYD';

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_customer_session_token ON customer(session_token)
  WHERE session_token IS NOT NULL;

-- 2. Customer Wallets table
-- ---------------------------------------------------------------
-- Each customer gets one wallet row (created automatically on first order
-- or when they set a password / create an account).
CREATE TABLE IF NOT EXISTS customer_wallets (
  id            bigserial PRIMARY KEY,
  customer_id   int8          NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  balance       numeric(14,3) NOT NULL DEFAULT 0,
  currency      varchar(10)   NOT NULL DEFAULT 'LYD',
  is_active     boolean       NOT NULL DEFAULT true,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (customer_id)        -- one wallet per customer
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_updated_at ON customer_wallets;
CREATE TRIGGER trg_wallet_updated_at
  BEFORE UPDATE ON customer_wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Wallet Transactions (ledger)
-- ---------------------------------------------------------------
CREATE TYPE IF NOT EXISTS wallet_tx_type AS ENUM (
  'deposit',    -- customer topped up
  'order_pay',  -- used wallet to pay for an order
  'refund',     -- order refunded to wallet
  'adjustment', -- manual admin correction
  'bonus'       -- bonus / promotional credit
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              bigserial      PRIMARY KEY,
  wallet_id       bigint         NOT NULL REFERENCES customer_wallets(id) ON DELETE CASCADE,
  customer_id     int8           NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  tx_type         wallet_tx_type NOT NULL,
  amount          numeric(14,3)  NOT NULL,  -- positive = credit, negative = debit
  balance_after   numeric(14,3)  NOT NULL,
  reference_id    text,                     -- e.g. order internal_ref or payment id
  notes           text,
  created_by      uuid,                     -- admin user id if manual
  created_at      timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id   ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer_id ON wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at  ON wallet_transactions(created_at DESC);

-- 4. Convenience view: wallet summary per customer
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW customer_wallet_summary AS
SELECT
  c.id            AS customer_id,
  c.name          AS customer_name,
  c.phone,
  cw.id           AS wallet_id,
  cw.balance,
  cw.currency,
  cw.is_active,
  cw.updated_at   AS wallet_updated_at,
  (
    SELECT COUNT(*)
    FROM wallet_transactions wt
    WHERE wt.wallet_id = cw.id
  )               AS tx_count
FROM customer c
LEFT JOIN customer_wallets cw ON cw.customer_id = c.id;

-- 5. RLS policies (adjust to match your existing RLS setup)
-- ---------------------------------------------------------------
ALTER TABLE customer_wallets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;

-- Allow service-role (admin) full access
CREATE POLICY "service_role_wallets_all"
  ON customer_wallets FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_wallet_tx_all"
  ON wallet_transactions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 6. Helper function: credit or debit a wallet atomically
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION wallet_adjust(
  p_customer_id int8,
  p_amount      numeric,          -- positive = credit, negative = debit
  p_tx_type     wallet_tx_type,
  p_reference   text  DEFAULT NULL,
  p_notes       text  DEFAULT NULL,
  p_created_by  uuid  DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet  customer_wallets;
  v_new_bal numeric;
  v_tx      wallet_transactions;
BEGIN
  -- Get or create wallet
  INSERT INTO customer_wallets (customer_id) VALUES (p_customer_id)
    ON CONFLICT (customer_id) DO NOTHING;

  SELECT * INTO v_wallet
    FROM customer_wallets WHERE customer_id = p_customer_id FOR UPDATE;

  v_new_bal := v_wallet.balance + p_amount;

  IF v_new_bal < 0 THEN
    RAISE EXCEPTION 'Insufficient wallet balance (current: %, debit: %)', v_wallet.balance, p_amount;
  END IF;

  UPDATE customer_wallets
    SET balance    = v_new_bal,
        updated_at = now()
    WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions
    (wallet_id, customer_id, tx_type, amount, balance_after, reference_id, notes, created_by)
  VALUES
    (v_wallet.id, p_customer_id, p_tx_type, p_amount, v_new_bal, p_reference, p_notes, p_created_by)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql;
