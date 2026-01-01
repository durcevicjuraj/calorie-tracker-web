-- Add unit field to meal_foods table
ALTER TABLE meal_foods
ADD COLUMN unit TEXT NOT NULL DEFAULT 'servings';

-- Remove the default after adding the column
ALTER TABLE meal_foods
ALTER COLUMN unit DROP DEFAULT;
