-- Orders Database Schema
-- This schema supports multi-currency orders with exchange rates, expenses, and shipping tracking

-- ============================================
-- 1. ORDERS TABLE (الطلبات)
-- ============================================
-- CREATE TABLE IF NOT EXISTS orders (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   internal_ref VARCHAR(50) UNIQUE NOT NULL, -- مثل: ORD-1234567890
--   customer_id INT8 NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  
--   -- Order Information
--   order_date DATE NOT NULL DEFAULT CURRENT_DATE,
--   order_source VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual', 'shein', 'other'
--   basket_link TEXT, -- رابط السلة (اختياري)
--   expected_delivery_date DATE,
--   notes TEXT,
  
--   -- Financial Summary (all in base currency - LYD)
--   subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
--   expenses_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
--   service_fee DECIMAL(12, 2) NOT NULL DEFAULT 0, -- عمولة الخدمة (10%)
--   international_shipping DECIMAL(12, 2) NOT NULL DEFAULT 0,
--   local_delivery DECIMAL(12, 2) NOT NULL DEFAULT 0,
--   discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
--   total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- الإجمالي بالعملة الأساسية
  
--   -- Order Status
--   status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'shipping', 'delivered', 'cancelled'
--   has_issues BOOLEAN NOT NULL DEFAULT FALSE,
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   created_by UUID, -- user_id (if you have users table)
  
--   CONSTRAINT orders_status_check CHECK (status IN ('pending', 'processing', 'shipping', 'delivered', 'cancelled'))
-- );

-- -- Index for faster queries
-- CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
-- CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
-- CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
-- CREATE INDEX IF NOT EXISTS idx_orders_internal_ref ON orders(internal_ref);

-- ============================================
-- 2. ORDER ITEMS TABLE (عناصر الطلب)
-- ============================================
-- CREATE TABLE IF NOT EXISTS order_items (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
--   -- Product Information
--   name VARCHAR(255) NOT NULL,
--   product_id VARCHAR(100), -- SKU or external product ID
--   variant TEXT, -- مثل: "M - blue" أو "44 - black"
--   sku VARCHAR(100),
  
--   -- Pricing (with multi-currency support)
--   quantity INTEGER NOT NULL DEFAULT 1,
--   unit_price DECIMAL(12, 2) NOT NULL, -- سعر التكلفة (في العملة الأصلية)
--   selling_price DECIMAL(12, 2) NOT NULL, -- سعر البيع (بالدينار الليبي)
--   currency VARCHAR(3) NOT NULL DEFAULT 'LYD', -- 'LYD', 'EUR', 'USD', 'GBP', 'TRY'
--   exchange_rate DECIMAL(10, 4) NOT NULL DEFAULT 1.0, -- سعر الصرف إلى LYD
--   total_price DECIMAL(12, 2) NOT NULL, -- quantity * unit_price
--   total_price_lyd DECIMAL(12, 2) NOT NULL, -- total_price * exchange_rate
--   total_selling_price DECIMAL(12, 2) NOT NULL, -- quantity * selling_price (إجمالي سعر البيع)
  
--   -- Product Details
--   product_link TEXT, -- رابط المنتج الأصلي
--   images TEXT[], -- Array of image URLs
--   weight VARCHAR(50),
--   dimensions VARCHAR(100),
--   color VARCHAR(50),
--   size VARCHAR(50),
  
--   -- Status
--   availability VARCHAR(20) DEFAULT 'unknown', -- 'in_stock', 'out_of_stock', 'unknown'
--   status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'received', 'missing', 'damaged'
--   is_locked BOOLEAN DEFAULT FALSE, -- إذا كان من API ولا يمكن تعديله
  
--   -- Source
--   source VARCHAR(20) DEFAULT 'manual', -- 'manual', 'api', 'shein'
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
--   CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
--   CONSTRAINT order_items_unit_price_check CHECK (unit_price >= 0),
--   CONSTRAINT order_items_selling_price_check CHECK (selling_price >= 0),
--   CONSTRAINT order_items_currency_check CHECK (currency IN ('LYD', 'EUR', 'USD', 'GBP', 'TRY'))
-- );

-- -- Indexes
-- CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
-- CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- ============================================
-- 3. ORDER EXPENSES TABLE (مصروفات الطلب)
-- ============================================
-- CREATE TABLE IF NOT EXISTS order_expenses (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
--   expense_id UUID NOT NULL, -- Reference to expenses table (will be created later)
  
--   -- Expense details at time of order (snapshot)
--   expense_name VARCHAR(255) NOT NULL,
--   expense_name_en VARCHAR(255),
--   cost DECIMAL(12, 2) NOT NULL,
--   currency VARCHAR(3) NOT NULL DEFAULT 'LYD',
--   category VARCHAR(50), -- 'packaging', 'shipping', 'storage', 'other'
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
--   CONSTRAINT order_expenses_cost_check CHECK (cost >= 0)
-- );

-- -- Index
-- CREATE INDEX IF NOT EXISTS idx_order_expenses_order_id ON order_expenses(order_id);

-- -- ============================================
-- -- 4. ORDER SHIPPING TABLE (معلومات الشحن)
-- -- ============================================
-- CREATE TABLE IF NOT EXISTS order_shipping (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
--   -- International Shipping
--   international_company VARCHAR(100), -- 'dhl', 'fedex', 'aramex', 'other'
--   international_tracking VARCHAR(255),
  
--   -- Local Shipping
--   local_company VARCHAR(100), -- 'libya-post', 'local-courier', 'pickup'
--   local_tracking VARCHAR(255),
  
--   -- Warehouse
--   warehouse VARCHAR(255),
  
--   -- Shipping Stage
--   shipping_stage VARCHAR(50) DEFAULT 'not_started', 
--   -- 'not_started', 'international_shipping', 'arrived_libya', 'local_delivery', 'delivered'
  
--   -- Dates
--   international_shipped_date DATE,
--   arrived_libya_date DATE,
--   local_delivery_date DATE,
--   delivered_date DATE,
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
--   CONSTRAINT order_shipping_stage_check CHECK (
--     shipping_stage IN ('not_started', 'international_shipping', 'arrived_libya', 'local_delivery', 'delivered')
--   )
-- );

-- -- Index
-- CREATE INDEX IF NOT EXISTS idx_order_shipping_order_id ON order_shipping(order_id);
-- CREATE INDEX IF NOT EXISTS idx_order_shipping_stage ON order_shipping(shipping_stage);

-- ============================================
-- 5. ORDER PAYMENTS TABLE (معلومات الدفع)
-- ============================================
-- CREATE TABLE IF NOT EXISTS order_payments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
--   -- Deposit Information
--   deposit_required DECIMAL(12, 2) DEFAULT 0,
--   deposit_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage', 'fixed'
--   deposit_paid BOOLEAN DEFAULT FALSE,
--   deposit_amount DECIMAL(12, 2) DEFAULT 0, -- المبلغ المدفوع فعلياً
--   deposit_payment_method VARCHAR(50), -- 'cash', 'transfer', 'card'
--   deposit_paid_date DATE,
  
--   -- Balance
--   remaining_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
--   -- Payment Status
--   payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
--   CONSTRAINT order_payments_deposit_type_check CHECK (deposit_type IN ('percentage', 'fixed')),
--   CONSTRAINT order_payments_payment_status_check CHECK (payment_status IN ('unpaid', 'partial', 'paid'))
-- );

-- -- Index
-- CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
-- CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(payment_status);

-- ============================================
-- 6. EXPENSES TABLE (المصروفات)
-- ============================================
-- CREATE TABLE IF NOT EXISTS expenses (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
--   -- Expense Information
--   name VARCHAR(255) NOT NULL, -- الاسم بالعربي
--   name_en VARCHAR(255), -- الاسم بالإنجليزي
--   description TEXT,
  
--   -- Pricing
--   cost DECIMAL(12, 2) NOT NULL,
--   currency VARCHAR(3) NOT NULL DEFAULT 'LYD',
  
--   -- Category
--   category VARCHAR(50) NOT NULL DEFAULT 'other', -- 'packaging', 'shipping', 'storage', 'other'
  
--   -- Status
--   is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
--   -- Timestamps
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
--   CONSTRAINT expenses_cost_check CHECK (cost >= 0),
--   CONSTRAINT expenses_currency_check CHECK (currency IN ('LYD', 'EUR', 'USD', 'GBP', 'TRY'))
-- );

-- -- Index
-- CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
-- CREATE INDEX IF NOT EXISTS idx_expenses_active ON expenses(is_active);

-- -- ============================================
-- -- 7. TRIGGERS FOR UPDATED_AT
-- -- ============================================
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_order_shipping_updated_at BEFORE UPDATE ON order_shipping
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_order_payments_updated_at BEFORE UPDATE ON order_payments
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. VIEWS FOR EASIER QUERIES
-- ============================================

-- View: Orders with customer and payment info
-- Note: Uncomment this view after creating all tables
-- CREATE OR REPLACE VIEW orders_summary AS
-- SELECT 
--   o.id,
--   o.internal_ref,
--   o.order_date,
--   o.status,
--   o.total_amount,
--   o.has_issues,
--   c.name AS customer_name,
--   c.phone AS customer_phone,
--   op.payment_status,
--   op.remaining_balance,
--   os.shipping_stage
-- FROM orders o
-- LEFT JOIN customer c ON o.customer_id = c.id
-- LEFT JOIN order_payments op ON o.id = op.order_id
-- LEFT JOIN order_shipping os ON o.id = os.order_id;

-- ============================================
-- NOTES:
-- ============================================
-- 1. All monetary values in orders table are in base currency (LYD)
-- 2. Order items store original currency and exchange rate for accurate tracking
-- 3. Expenses are linked to orders via order_expenses table
-- 4. Shipping tracking is separate table for better organization
-- 5. Payments are tracked separately for deposit and balance management
-- 6. All tables use UUID for better scalability and security
-- 7. Foreign keys ensure data integrity
-- 8. Indexes are added for common query patterns

