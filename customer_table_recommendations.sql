-- ============================================
-- Customer Table Recommendations
-- Based on codebase analysis
-- ============================================

-- Your current table has:
-- ✅ id (int8, PK)
-- ✅ created_at (timestamptz)
-- ✅ name (varchar)
-- ✅ phone (varchar)
-- ✅ fb_account (text) - Facebook account
-- ✅ wh_account (text) - WhatsApp account

-- ============================================
-- MISSING FIELDS (Recommended to add)
-- ============================================

-- 1. EMAIL - Used in order detail page
ALTER TABLE customer ADD COLUMN email VARCHAR(255);

-- 2. ADDRESS - Used in order detail page for delivery
ALTER TABLE customer ADD COLUMN address TEXT;

-- 3. UPDATED_AT - Standard for tracking changes
ALTER TABLE customer ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. NOTES - For internal notes about the customer
ALTER TABLE customer ADD COLUMN notes TEXT;

-- 5. ACTIVE/STATUS - To mark customers as active/inactive (soft delete)
ALTER TABLE customer ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- ============================================
-- OPTIONAL BUT RECOMMENDED FIELDS
-- ============================================

-- Preferred contact method (for communication preferences)
ALTER TABLE customer ADD COLUMN preferred_contact VARCHAR(20) 
  CHECK (preferred_contact IN ('phone', 'whatsapp', 'facebook', 'email'));

-- Total orders count (denormalized for performance)
ALTER TABLE customer ADD COLUMN total_orders INTEGER DEFAULT 0;

-- Total spent (denormalized for performance)
ALTER TABLE customer ADD COLUMN total_spent DECIMAL(10, 2) DEFAULT 0;

-- Last order date (for analytics)
ALTER TABLE customer ADD COLUMN last_order_date TIMESTAMPTZ;

-- ============================================
-- INDEXES (Recommended)
-- ============================================

CREATE INDEX idx_customer_phone ON customer(phone);
CREATE INDEX idx_customer_email ON customer(email);
CREATE INDEX idx_customer_is_active ON customer(is_active);
CREATE INDEX idx_customer_name ON customer(name);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_customer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_updated_at_trigger
  BEFORE UPDATE ON customer
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_updated_at();

-- ============================================
-- CONSTRAINTS (Recommended)
-- ============================================

-- Ensure phone is unique (if applicable)
-- ALTER TABLE customer ADD CONSTRAINT unique_phone UNIQUE (phone);

-- Ensure email is unique (if applicable)
-- ALTER TABLE customer ADD CONSTRAINT unique_email UNIQUE (email);

-- ============================================
-- COMPLETE TABLE STRUCTURE (Reference)
-- ============================================

/*
CREATE TABLE customer (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  
  -- Social Accounts
  fb_account TEXT, -- Facebook account
  wh_account TEXT, -- WhatsApp account
  
  -- Preferences
  preferred_contact VARCHAR(20) CHECK (preferred_contact IN ('phone', 'whatsapp', 'facebook', 'email')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Analytics (denormalized)
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  
  -- Notes
  notes TEXT
);

-- Indexes
CREATE INDEX idx_customer_phone ON customer(phone);
CREATE INDEX idx_customer_email ON customer(email);
CREATE INDEX idx_customer_is_active ON customer(is_active);
CREATE INDEX idx_customer_name ON customer(name);
*/

-- ============================================
-- EXAMPLE CUSTOMER INSERTS
-- ============================================

-- Example 1: Complete customer with all fields
INSERT INTO customer (
  name,
  phone,
  email,
  address,
  fb_account,
  wh_account,
  preferred_contact,
  is_active,
  notes
) VALUES (
  'أحمد محمد علي',
  '0912345644',
  'ahmed.mohammed@example.com',
  'طرابلس، شارع الجمهورية، بناية رقم 15، الطابق الثاني',
  'https://facebook.com/ahmed.mohammed',
  '+218912345678',
  'whatsapp',
  TRUE,
  'عميل متكرر، يفضل التواصل عبر واتساب'
);

-- Example 2: Customer with minimal info (only required fields)
INSERT INTO customer (
  name,
  phone
) VALUES (
  'فاطمة علي',
  '0923456789'
);

-- Example 3: Customer with Facebook account
INSERT INTO customer (
  name,
  phone,
  fb_account,
  preferred_contact,
  address,
  notes
) VALUES (
  'خالد حسن',
  '0934567890',
  'https://facebook.com/khalid.hassan',
  'facebook',
  'بنغازي، حي السلماني',
  'يفضل التواصل عبر فيسبوك'
);

-- Example 4: Customer with email and address
INSERT INTO customer (
  name,
  phone,
  email,
  address,
  preferred_contact,
  is_active
) VALUES (
  'سارة أحمد',
  '0945678901',
  'sara.ahmed@example.com',
  'مصراتة، شارع البحر، قرب الميناء',
  'email',
  TRUE
);-- Example 5: Inactive customer (soft delete)
INSERT INTO customer (
  name,
  phone,
  email,
  is_active,
  notes
) VALUES (
  'محمد يوسف',
  '0956789012',
  'mohammed.youssef@example.com',
  FALSE,
  'عميل غير نشط - آخر طلب قبل 6 أشهر'
);

-- Example 6: Customer with all optional fields
INSERT INTO customer (
  name,
  phone,
  email,
  address,
  fb_account,
  wh_account,
  preferred_contact,
  is_active,
  total_orders,
  total_spent,
  last_order_date,
  notes
) VALUES (
  'ليلى محمود',
  '0967890123',
  'laila.mahmoud@example.com',
  'طرابلس، حي الأندلس، شارع النصر',
  'https://facebook.com/laila.mahmoud',
  '+218967890123',
  'whatsapp',
  TRUE,
  5,
  1250.00,
  NOW() - INTERVAL '10 days',
  'عميل ممتاز، يطلب بانتظام، يفضل الدفع نقداً عند الاستلام'
);

-- ============================================
-- QUERY EXAMPLES
-- ============================================

-- Get all active customers
SELECT * FROM customer WHERE is_active = TRUE ORDER BY name;

-- Get customer by phone
SELECT * FROM customer WHERE phone = '0912345678';

-- Get customers who prefer WhatsApp
SELECT name, phone, wh_account 
FROM customer 
WHERE preferred_contact = 'whatsapp' AND is_active = TRUE;

-- Get top customers by total spent
SELECT name, phone, total_orders, total_spent, last_order_date
FROM customer
WHERE is_active = TRUE
ORDER BY total_spent DESC
LIMIT 10;
