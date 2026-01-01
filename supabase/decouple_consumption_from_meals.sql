-- Remove the foreign key constraint from user_consumption to meals
-- This makes logged consumption independent - deleting a meal won't delete consumption records

-- Drop the foreign key constraint
ALTER TABLE user_consumption
DROP CONSTRAINT IF EXISTS user_consumption_meal_id_fkey;

-- Make meal_id nullable (it becomes just a reference, not a requirement)
ALTER TABLE user_consumption
ALTER COLUMN meal_id DROP NOT NULL;

-- Now user_consumption records are snapshots that persist even if the meal is deleted
-- meal_id is kept for reference purposes but is no longer enforced
