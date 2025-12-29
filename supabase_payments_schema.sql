-- ============================================
-- Payment System Database Schema for Supabase
-- ============================================

-- Enable UUID extension (Supabase has this by default, but good to include)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- Payment types
CREATE TYPE payment_type AS ENUM ('deposit', 'balance', 'refund');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'bank');

-- Payment statuses
CREATE TYPE payment_status AS ENUM (
  'pending',      -- معلق
  'received',     -- مستلم
  'partial',      -- جزئي
  'completed',    -- مكتمل
  'processed',    -- قيد المعالجة
  'refunded',     -- مسترد
  'overdue',      -- متأخر
  'due',          -- مستحق
  'not_due'       -- غير مستحق بعد
);

-- Deposit statuses (specific to deposits)
CREATE TYPE deposit_status AS ENUM (
  'pending',      -- معلق
  'received',     -- مستلم
  'partial',      -- جزئي
  'refunded'      -- مسترد
);

-- Delivery statuses (for pending balances)
CREATE TYPE delivery_status AS ENUM (
  'pending',      -- لم يتم التسليم
  'shipping',     -- قيد الشحن
  'delivered'     -- مسلم
);

-- ============================================
-- MAIN PAYMENTS TABLE
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Payment identification
  payment_number TEXT UNIQUE NOT NULL, -- e.g., 'DEP-001', 'REF-001', 'BAL-001'
  
  -- Relationships
  order_id UUID, -- Foreign key to orders table (if exists)
  customer_id UUID, -- Foreign key to customers table (if exists)
  customer_name TEXT NOT NULL, -- Denormalized for quick access
  
  -- Payment details
  payment_type payment_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  
  -- Deposit-specific fields
  required_amount DECIMAL(10, 2), -- For deposits: المبلغ المطلوب
  received_amount DECIMAL(10, 2), -- For deposits: المبلغ المستلم
  
  -- Refund-specific fields
  refund_reason TEXT, -- سبب الاسترداد
  related_issue TEXT, -- Related issue ID (e.g., 'ISSUE-001')
  related_item TEXT, -- Related item description
  
  -- Payment method and processing
  payment_method payment_method,
  refund_method payment_method, -- For refunds
  
  -- Status tracking
  status payment_status NOT NULL DEFAULT 'pending',
  deposit_status deposit_status, -- Only for deposits
  
  -- Dates
  date_received TIMESTAMP WITH TIME ZONE,
  date_processed TIMESTAMP WITH TIME ZONE, -- For refunds
  due_date TIMESTAMP WITH TIME ZONE, -- For pending balances
  
  -- Personnel tracking
  received_by TEXT, -- استلم من قبل
  processed_by TEXT, -- For refunds: processedBy
  
  -- Proof and documentation
  has_proof BOOLEAN DEFAULT FALSE, -- For refunds: hasProof
  proof_url TEXT, -- URL to proof document/image
  
  -- Order status (denormalized for quick access)
  order_status TEXT, -- e.g., 'ordered', 'pending', 'cancelled'
  
  -- Delivery tracking (for pending balances)
  delivery_status delivery_status,
  delivery_date TIMESTAMP WITH TIME ZONE,
  days_overdue INTEGER DEFAULT 0,
  
  -- Balance tracking (for pending balances)
  total_amount DECIMAL(10, 2), -- المبلغ الإجمالي
  total_paid DECIMAL(10, 2), -- المبلغ المدفوع
  remaining_balance DECIMAL(10, 2), -- الرصيد المتبقي
  
  -- Metadata
  notes TEXT, -- Additional notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID, -- User who created the payment
  updated_by UUID -- User who last updated the payment
);

-- ============================================
-- INDEXES
-- ============================================

-- Indexes for common queries
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_customer_name ON payments(customer_name);
CREATE INDEX idx_payments_payment_type ON payments(payment_type);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_deposit_status ON payments(deposit_status);
CREATE INDEX idx_payments_date_received ON payments(date_received);
CREATE INDEX idx_payments_date_processed ON payments(date_processed);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_payment_number ON payments(payment_number);

-- Composite indexes for common filter combinations
CREATE INDEX idx_payments_type_status ON payments(payment_type, status);
CREATE INDEX idx_payments_delivery_status ON payments(delivery_status);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp


-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS (adjust policies based on your auth requirements)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow all authenticated users to read payments
-- Adjust based on your authentication setup
CREATE POLICY "Allow authenticated users to read payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (true);

-- Example policy: Allow authenticated users to insert payments
CREATE POLICY "Allow authenticated users to insert payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Example policy: Allow authenticated users to update payments
CREATE POLICY "Allow authenticated users to update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Example policy: Allow authenticated users to delete payments (optional)
-- CREATE POLICY "Allow authenticated users to delete payments"
--   ON payments
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for deposits
CREATE VIEW deposits_view AS
SELECT 
  id,
  payment_number,
  order_id,
  customer_id,
  customer_name,
  amount,
  required_amount,
  received_amount,
  payment_method,
  date_received,
  received_by,
  status,
  deposit_status,
  order_status,
  created_at,
  updated_at
FROM payments
WHERE payment_type = 'deposit';

-- View for refunds
CREATE VIEW refunds_view AS
SELECT 
  id,
  payment_number,
  order_id,
  customer_id,
  customer_name,
  amount,
  refund_reason,
  related_issue,
  related_item,
  refund_method,
  status,
  date_processed,
  processed_by,
  has_proof,
  proof_url,
  created_at,
  updated_at
FROM payments
WHERE payment_type = 'refund';

-- View for pending balances
CREATE VIEW pending_balances_view AS
SELECT 
  id,
  payment_number,
  order_id,
  customer_id,
  customer_name,
  total_amount,
  total_paid,
  remaining_balance,
  delivery_status,
  delivery_date,
  days_overdue,
  status,
  due_date,
  created_at,
  updated_at
FROM payments
WHERE payment_type = 'balance';

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample data for testing

/*
-- Sample deposit
INSERT INTO payments (
  payment_type,
  customer_name,
  amount,
  required_amount,
  received_amount,
  payment_method,
  date_received,
  received_by,
  status,
  deposit_status,
  order_status
) VALUES (
  'deposit',
  'أحمد محمد',
  100.00,
  100.00,
  100.00,
  'transfer',
  NOW() - INTERVAL '10 days',
  'محمد علي',
  'received',
  'received',
  'ordered'
);

-- Sample refund
INSERT INTO payments (
  payment_type,
  customer_name,
  amount,
  refund_reason,
  related_issue,
  related_item,
  refund_method,
  status,
  date_processed,
  processed_by,
  has_proof
) VALUES (
  'refund',
  'أحمد يوسف',
  50.00,
  'عنصر مفقود',
  'ISSUE-001',
  'قميص أزرق - حجم M',
  'transfer',
  'completed',
  NOW() - INTERVAL '5 days',
  'محمد علي',
  true
);

-- Sample pending balance
INSERT INTO payments (
  payment_type,
  customer_name,
  total_amount,
  total_paid,
  remaining_balance,
  delivery_status,
  delivery_date,
  days_overdue,
  status,
  due_date
) VALUES (
  'balance',
  'علي حسن',
  350.00,
  200.00,
  150.00,
  'delivered',
  NOW() - INTERVAL '10 days',
  5,
  'overdue',
  NOW() - INTERVAL '5 days'
);
*/

-- ============================================
-- NOTES
-- ============================================
/*
1. Foreign Keys:
   - If you have orders and customers tables, add foreign key constraints:
     ALTER TABLE payments ADD CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id);
     ALTER TABLE payments ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

2. Authentication:
   - Adjust RLS policies based on your Supabase authentication setup
   - You may want to use service_role for admin operations

3. Indexes:
   - Monitor query performance and add additional indexes as needed
   - Consider partial indexes for frequently filtered statuses

4. Constraints:
   - Add CHECK constraints for business logic (e.g., received_amount <= required_amount)
   - Add NOT NULL constraints where appropriate

5. Archiving:
   - Consider adding an archived_at timestamp for soft deletes
   - Create an archive table for historical data if needed
*/

