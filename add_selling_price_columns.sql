-- Add selling_price columns to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Add constraint for selling_price (using DO block to check if constraint exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'order_items_selling_price_check'
    ) THEN
        ALTER TABLE order_items 
        ADD CONSTRAINT order_items_selling_price_check 
        CHECK (selling_price >= 0);
    END IF;
END $$;

