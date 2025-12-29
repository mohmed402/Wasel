-- -- ============================================
-- -- Financial System Database Schema for Supabase
-- -- نظام قاعدة البيانات المالية
-- -- ============================================

-- -- Enable UUID extension (Supabase has this by default)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -- ============================================
-- -- ENUMS
-- -- ============================================

-- -- Account types
-- CREATE TYPE account_type AS ENUM ('asset', 'liability');

-- -- Asset categories
-- CREATE TYPE asset_category AS ENUM (
--   'cash',        -- الصندوق
--   'bank',        -- حساب بنكي
--   'wallet',      -- محفظة إلكترونية
--   'gateway',     -- بوابة دفع
--   'receivable'   -- ذمم مدينة
-- );

-- -- Liability categories
-- CREATE TYPE liability_category AS ENUM (
--   'suppliers',   -- مستحقات الموردين
--   'salaries',    -- رواتب مستحقة
--   'tax',         -- ضرائب مستحقة
--   'refunds',     -- مبالغ مستردة للعملاء
--   'delivery'     -- مستحقات منصات التوصيل
-- );

-- -- Transaction types
-- CREATE TYPE transaction_type AS ENUM (
--   'credit',      -- إيداع/زيادة
--   'debit',       -- سحب/نقصان
--   'transfer'     -- تحويل
-- );

-- -- Supported currencies
-- CREATE TYPE currency_code AS ENUM ('EUR', 'USD', 'GBP', 'LYD', 'TRY');

-- -- ============================================
-- -- 1. FINANCIAL_ACCOUNTS TABLE (حسابات مالية)
-- -- ============================================

-- CREATE TABLE IF NOT EXISTS financial_accounts (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
--   -- Account Information
--   name VARCHAR(255) NOT NULL, -- اسم الحساب
--   account_type account_type NOT NULL, -- 'asset' or 'liability'
  
--   -- Category (depends on account_type)
--   asset_category asset_category, -- للأصول
--   liability_category liability_category, -- للالتزامات
  
--   -- Financial Details
--   currency currency_code NOT NULL DEFAULT 'EUR',
--   balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  
--   -- Due Date (mainly for liabilities)
--   due_date DATE,
  
--   -- Display Properties
--   color VARCHAR(7) DEFAULT '#2563EB', -- Hex color code
  
--   -- Status
--   is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
--   -- Additional Information
--   notes TEXT,
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   created_by UUID, -- User who created the account
--   updated_by UUID, -- User who last updated the account
  
--   -- Constraints
--   CONSTRAINT financial_accounts_category_check CHECK (
--     (account_type = 'asset' AND asset_category IS NOT NULL AND liability_category IS NULL) OR
--     (account_type = 'liability' AND liability_category IS NOT NULL AND asset_category IS NULL)
--   )
-- );

-- ============================================
-- 2. FINANCIAL_TRANSACTIONS TABLE (المعاملات المالية)
-- ============================================

-- CREATE TABLE IF NOT EXISTS financial_transactions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
--   -- Account Relationships
--   account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
--   related_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL, -- For transfers
  
--   -- Transaction Details
--   transaction_type transaction_type NOT NULL,
--   amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
--   currency currency_code NOT NULL,
--   exchange_rate DECIMAL(10, 4) NOT NULL DEFAULT 1.0 CHECK (exchange_rate > 0),
--   amount_in_base_currency DECIMAL(12, 2) NOT NULL, -- Calculated: amount * exchange_rate
  
--   -- Description and Reference
--   description TEXT NOT NULL,
--   reference_type VARCHAR(50), -- 'order', 'payment', 'expense', 'transfer', 'manual'
--   reference_id UUID, -- ID from related table (e.g., order_id)
  
--   -- Dates
--   transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
--   -- Metadata
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   created_by UUID, -- User who created the transaction
--   notes TEXT,
  
--   -- Constraints
--   CONSTRAINT financial_transactions_transfer_check CHECK (
--     (transaction_type = 'transfer' AND related_account_id IS NOT NULL) OR
--     (transaction_type != 'transfer')
--   )
-- );

-- -- ============================================
-- -- 3. EXCHANGE_RATES TABLE (أسعار الصرف) - Optional
-- -- ============================================

-- CREATE TABLE IF NOT EXISTS exchange_rates (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
--   -- Currency Pair
--   from_currency currency_code NOT NULL,
--   to_currency currency_code NOT NULL,
  
--   -- Rate
--   rate DECIMAL(10, 4) NOT NULL CHECK (rate > 0),
  
--   -- Effective Date
--   effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
--   -- Source
--   source VARCHAR(100), -- 'manual', 'api', 'bank'
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
--   -- Constraints
--   CONSTRAINT exchange_rates_currency_pair_check CHECK (from_currency != to_currency),
--   CONSTRAINT exchange_rates_unique_pair_date UNIQUE (from_currency, to_currency, effective_date)
-- );

-- ============================================
-- 4. FINANCIAL_SETTINGS TABLE (إعدادات مالية) - Optional
-- ============================================

-- CREATE TABLE IF NOT EXISTS financial_settings (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
--   -- Base Currency
--   base_currency currency_code NOT NULL DEFAULT 'LYD',
  
--   -- Additional Settings (JSON format for flexibility)
--   settings_json JSONB DEFAULT '{}',
  
--   -- Timestamps
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_by UUID,
  
--   -- Ensure only one settings record
--   CONSTRAINT financial_settings_single_row CHECK (id = '00000000-0000-0000-0000-000000000000'::UUID)
-- );

-- -- Insert default settings row (only one row should exist)
-- INSERT INTO financial_settings (id, base_currency)
-- VALUES ('00000000-0000-0000-0000-000000000000'::UUID, 'EUR')
-- ON CONFLICT (id) DO NOTHING;

-- -- ============================================
-- -- INDEXES
-- -- ============================================

-- -- Financial Accounts Indexes
-- CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON financial_accounts(account_type);
-- CREATE INDEX IF NOT EXISTS idx_financial_accounts_asset_category ON financial_accounts(asset_category);
-- CREATE INDEX IF NOT EXISTS idx_financial_accounts_liability_category ON financial_accounts(liability_category);
-- CREATE INDEX IF NOT EXISTS idx_financial_accounts_currency ON financial_accounts(currency);
-- CREATE INDEX IF NOT EXISTS idx_financial_accounts_active ON financial_accounts(is_active);
-- CREATE INDEX IF NOT EXISTS idx_financial_accounts_due_date ON financial_accounts(due_date) WHERE due_date IS NOT NULL;

-- -- Financial Transactions Indexes
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_account_id ON financial_transactions(account_id);
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_related_account_id ON financial_transactions(related_account_id) WHERE related_account_id IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference ON financial_transactions(reference_type, reference_id) WHERE reference_type IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_currency ON financial_transactions(currency);

-- -- Composite indexes for common queries
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_account_date ON financial_transactions(account_id, transaction_date DESC);

-- -- Exchange Rates Indexes
-- CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_currency ON exchange_rates(from_currency);
-- CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_currency ON exchange_rates(to_currency);
-- CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- -- Apply trigger to relevant tables
-- CREATE TRIGGER update_financial_accounts_updated_at 
--   BEFORE UPDATE ON financial_accounts
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_exchange_rates_updated_at 
--   BEFORE UPDATE ON exchange_rates
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_financial_settings_updated_at 
--   BEFORE UPDATE ON financial_settings
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -- ============================================
-- -- FUNCTION: Update Account Balance
-- -- ============================================

-- -- Function to recalculate account balance based on transactions
-- CREATE OR REPLACE FUNCTION recalculate_account_balance(account_uuid UUID)
-- RETURNS DECIMAL(12, 2) AS $$
-- DECLARE
--   new_balance DECIMAL(12, 2);
-- BEGIN
--   SELECT COALESCE(SUM(
--     CASE 
--       WHEN transaction_type = 'credit' THEN amount_in_base_currency
--       WHEN transaction_type = 'debit' THEN -amount_in_base_currency
--       WHEN transaction_type = 'transfer' AND account_id = account_uuid THEN -amount_in_base_currency
--       WHEN transaction_type = 'transfer' AND related_account_id = account_uuid THEN amount_in_base_currency
--       ELSE 0
--     END
--   ), 0) INTO new_balance
--   FROM financial_transactions
--   WHERE account_id = account_uuid OR related_account_id = account_uuid;
  
--   UPDATE financial_accounts
--   SET balance = new_balance
--   WHERE id = account_uuid;
  
--   RETURN new_balance;
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

-- Financial Accounts Policies
CREATE POLICY "Allow authenticated users to read financial accounts"
  ON financial_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert financial accounts"
  ON financial_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update financial accounts"
  ON financial_accounts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete financial accounts"
  ON financial_accounts
  FOR DELETE
  TO authenticated
  USING (true);

-- Financial Transactions Policies
CREATE POLICY "Allow authenticated users to read financial transactions"
  ON financial_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert financial transactions"
  ON financial_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update financial transactions"
  ON financial_transactions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete financial transactions"
  ON financial_transactions
  FOR DELETE
  TO authenticated
  USING (true);

-- Exchange Rates Policies
CREATE POLICY "Allow authenticated users to read exchange rates"
  ON exchange_rates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage exchange rates"
  ON exchange_rates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Financial Settings Policies
CREATE POLICY "Allow authenticated users to read financial settings"
  ON financial_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update financial settings"
  ON financial_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VIEWS FOR EASIER QUERIES
-- ============================================

-- View: Assets Summary
-- CREATE OR REPLACE VIEW assets_view AS
-- SELECT 
--   id,
--   name,
--   asset_category AS category,
--   currency,
--   balance,
--   due_date,
--   color,
--   is_active,
--   notes,
--   created_at,
--   updated_at
-- FROM financial_accounts
-- WHERE account_type = 'asset' AND is_active = TRUE;

-- -- View: Liabilities Summary
-- CREATE OR REPLACE VIEW liabilities_view AS
-- SELECT 
--   id,
--   name,
--   liability_category AS category,
--   currency,
--   balance,
--   due_date,
--   color,
--   is_active,
--   notes,
--   created_at,
--   updated_at,
--   CASE 
--     WHEN due_date IS NULL THEN NULL
--     ELSE due_date - CURRENT_DATE
--   END AS days_until_due
-- FROM financial_accounts
-- WHERE account_type = 'liability' AND is_active = TRUE;

-- -- View: Recent Transactions (Last 50 transactions per account)
-- CREATE OR REPLACE VIEW recent_transactions_view AS
-- SELECT 
--   ft.id,
--   ft.account_id,
--   fa.name AS account_name,
--   fa.account_type,
--   ft.transaction_type,
--   ft.amount,
--   ft.currency,
--   ft.exchange_rate,
--   ft.amount_in_base_currency,
--   ft.description,
--   ft.reference_type,
--   ft.reference_id,
--   ft.transaction_date,
--   ft.created_at,
--   related_fa.name AS related_account_name
-- FROM financial_transactions ft
-- JOIN financial_accounts fa ON ft.account_id = fa.id
-- LEFT JOIN financial_accounts related_fa ON ft.related_account_id = related_fa.id
-- ORDER BY ft.transaction_date DESC, ft.created_at DESC;

-- -- View: Account Balances Summary (for dashboard)
-- CREATE OR REPLACE VIEW account_balances_summary AS
-- SELECT 
--   account_type,
--   currency,
--   COUNT(*) AS account_count,
--   SUM(balance) AS total_balance
-- FROM financial_accounts
-- WHERE is_active = TRUE
-- GROUP BY account_type, currency;

-- -- View: Latest Exchange Rates
-- CREATE OR REPLACE VIEW latest_exchange_rates AS
-- SELECT DISTINCT ON (from_currency, to_currency)
--   id,
--   from_currency,
--   to_currency,
--   rate,
--   effective_date,
--   created_at
-- FROM exchange_rates
-- ORDER BY from_currency, to_currency, effective_date DESC, created_at DESC;

-- -- ============================================
-- -- HELPER FUNCTIONS
-- -- ============================================

-- -- Function: Get Latest Exchange Rate
-- CREATE OR REPLACE FUNCTION get_latest_exchange_rate(
--   from_curr currency_code,
--   to_curr currency_code
-- )
-- RETURNS DECIMAL(10, 4) AS $$
-- DECLARE
--   latest_rate DECIMAL(10, 4);
-- BEGIN
--   -- If same currency, return 1.0
--   IF from_curr = to_curr THEN
--     RETURN 1.0;
--   END IF;
  
--   -- Get the latest rate
--   SELECT rate INTO latest_rate
--   FROM exchange_rates
--   WHERE from_currency = from_curr 
--     AND to_currency = to_curr
--   ORDER BY effective_date DESC, created_at DESC
--   LIMIT 1;
  
--   -- If no rate found, try reverse direction
--   IF latest_rate IS NULL THEN
--     SELECT (1.0 / rate) INTO latest_rate
--     FROM exchange_rates
--     WHERE from_currency = to_curr 
--       AND to_currency = from_curr
--     ORDER BY effective_date DESC, created_at DESC
--     LIMIT 1;
--   END IF;
  
--   -- If still no rate found, return 1.0 as default
--   RETURN COALESCE(latest_rate, 1.0);
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample data for testing
/*
-- Sample Asset Accounts
INSERT INTO financial_accounts (name, account_type, asset_category, currency, balance, color) VALUES
('الصندوق', 'asset', 'cash', 'EUR', 15000.00, '#16A34A'),
('حساب بنك أوروبي', 'asset', 'bank', 'EUR', 45000.00, '#2563EB'),
('حساب بنك دولي', 'asset', 'bank', 'USD', 25000.00, '#2563EB'),
('Stripe', 'asset', 'gateway', 'USD', 8500.00, '#F59E0B'),
('محفظة إلكترونية', 'asset', 'wallet', 'LYD', 3200.00, '#7C3AED'),
('ذمم مدينة', 'asset', 'receivable', 'EUR', 12500.00, '#DC2626');

-- Sample Liability Accounts
INSERT INTO financial_accounts (name, account_type, liability_category, currency, balance, due_date, color) VALUES
('مستحقات الموردين', 'liability', 'suppliers', 'EUR', 8500.00, CURRENT_DATE + INTERVAL '10 days', '#DC2626'),
('رواتب مستحقة', 'liability', 'salaries', 'EUR', 12000.00, CURRENT_DATE + INTERVAL '5 days', '#F59E0B'),
('ضرائب مستحقة', 'liability', 'tax', 'EUR', 3500.00, CURRENT_DATE + INTERVAL '20 days', '#7C3AED'),
('مبالغ مستردة للعملاء', 'liability', 'refunds', 'USD', 2100.00, NULL, '#16A34A'),
('مستحقات منصات التوصيل', 'liability', 'delivery', 'TRY', 1800.00, CURRENT_DATE + INTERVAL '15 days', '#2563EB');

-- Sample Exchange Rates
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
('EUR', 'USD', 1.08),
('EUR', 'GBP', 0.85),
('EUR', 'LYD', 5.2),
('EUR', 'TRY', 33.5),
('USD', 'EUR', 0.93),
('USD', 'GBP', 0.79),
('USD', 'LYD', 4.8),
('USD', 'TRY', 31.0);
*/

-- ============================================
-- NOTES
-- ============================================
/*
1. Account Types:
   - 'asset': الأصول (cash, bank accounts, wallets, payment gateways, receivables)
   - 'liability': المديونية/الالتزامات (suppliers, salaries, taxes, refunds, delivery)

2. Transaction Types:
   - 'credit': زيادة في الحساب (إيداع)
   - 'debit': نقصان في الحساب (سحب)
   - 'transfer': تحويل من/إلى حساب آخر

3. Currency Support:
   - Supported currencies: EUR, USD, GBP, LYD, TRY
   - All balances stored in account's currency
   - Transactions can have different currencies with exchange rates
   - amount_in_base_currency is calculated for reporting

4. Balance Calculation:
   - Account balance should be recalculated periodically or on-demand
   - Use recalculate_account_balance() function to update balances
   - Consider using triggers to auto-update balances (can impact performance)

5. Exchange Rates:
   - Store historical exchange rates for audit trail
   - Use latest_exchange_rates view to get current rates
   - Use get_latest_exchange_rate() function for calculations

6. RLS Policies:
   - Adjust policies based on your authentication requirements
   - Consider role-based access control for sensitive financial data

7. Foreign Keys:
   - Add foreign key constraints if you have users, orders, or other related tables:
     ALTER TABLE financial_accounts ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id);
     ALTER TABLE financial_transactions ADD CONSTRAINT fk_order FOREIGN KEY (reference_id) REFERENCES orders(id) WHERE reference_type = 'order';

8. Performance:
   - Balance recalculation can be expensive for accounts with many transactions
   - Consider materialized views or cached balances for frequently accessed data
   - Indexes are created for common query patterns

9. Audit Trail:
   - All transactions are immutable (no updates/deletes in production recommended)
   - Use created_by and updated_by for tracking who made changes
   - Consider adding an audit log table for compliance
*/

