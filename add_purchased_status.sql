-- SQL commands to add 'purchased' status to order_items.status column
-- Run these commands in your Supabase SQL Editor

-- Step 1: Find the constraint name (run this first to see the constraint name)
-- This will help you identify what constraint needs to be dropped
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'order_items'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

-- Step 2: Drop the existing constraint
-- Try these commands (one of them should work depending on your constraint name)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_status_check;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS check_order_items_status;

-- If the above don't work, use this to drop by finding it dynamically:
-- DO $$ 
-- DECLARE
--     constraint_name text;
-- BEGIN
--     SELECT conname INTO constraint_name
--     FROM pg_constraint
--     WHERE conrelid = 'order_items'::regclass
--         AND contype = 'c'
--         AND pg_get_constraintdef(oid) LIKE '%status%'
--         AND pg_get_constraintdef(oid) LIKE '%pending%';
--     
--     IF constraint_name IS NOT NULL THEN
--         EXECUTE 'ALTER TABLE order_items DROP CONSTRAINT ' || constraint_name;
--     END IF;
-- END $$;

-- Step 3: Add the new constraint with 'purchased' included
ALTER TABLE order_items 
ADD CONSTRAINT order_items_status_check 
CHECK (status IN ('pending', 'purchased', 'received', 'missing', 'damaged'));

-- Step 4: Verify the constraint was added correctly
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'order_items'::regclass
    AND conname = 'order_items_status_check';

