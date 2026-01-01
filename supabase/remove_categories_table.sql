-- Remove categories table and change category_id to category (text field)

-- First, drop the foreign key constraints
ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_category_id_fkey;
ALTER TABLE foods DROP CONSTRAINT IF EXISTS foods_category_id_fkey;

-- Add new category column (text)
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS category TEXT;

-- Drop old category_id columns
ALTER TABLE ingredients DROP COLUMN IF EXISTS category_id;
ALTER TABLE foods DROP COLUMN IF EXISTS category_id;

-- Drop categories table entirely
DROP TABLE IF EXISTS categories CASCADE;
