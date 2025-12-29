-- Simple SQL command to add 'purchased' status to order_items.status column
-- Copy and paste this into your Supabase SQL Editor and run it

-- Drop existing constraint (if it exists)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_status_check;

-- Add new constraint with 'purchased' included
ALTER TABLE order_items 
ADD CONSTRAINT order_items_status_check 
CHECK (status IN ('pending', 'purchased', 'received', 'missing', 'damaged'));

