-- Add purchase tracking columns to order_items table
-- These columns track which account was used to purchase the item and at what price

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS purchase_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3) DEFAULT 'LYD',
ADD COLUMN IF NOT EXISTS purchase_exchange_rate DECIMAL(10, 4) DEFAULT 1.0;

-- Add constraint for purchase_currency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'order_items_purchase_currency_check'
    ) THEN
        ALTER TABLE order_items 
        ADD CONSTRAINT order_items_purchase_currency_check 
        CHECK (purchase_currency IS NULL OR purchase_currency IN ('LYD', 'EUR', 'USD', 'GBP', 'TRY'));
    END IF;
END $$;

-- Add constraint for purchase_price
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'order_items_purchase_price_check'
    ) THEN
        ALTER TABLE order_items 
        ADD CONSTRAINT order_items_purchase_price_check 
        CHECK (purchase_price IS NULL OR purchase_price >= 0);
    END IF;
END $$;

-- Add index for purchase_account_id
CREATE INDEX IF NOT EXISTS idx_order_items_purchase_account_id ON order_items(purchase_account_id) WHERE purchase_account_id IS NOT NULL;

-- Add closed_at and closing_data columns to orders table for order closing tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closing_data JSONB;

-- Update status constraint to include 'closed'
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    -- Add new constraint with 'closed' status
    ALTER TABLE orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'processing', 'shipping', 'delivered', 'cancelled', 'closed'));
END $$;

