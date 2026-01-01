-- Add reference serving fields to foods table
-- These represent what the stored nutrition values are "per"
-- For example: "per 100g" or "per 1 piece"

ALTER TABLE foods
ADD COLUMN reference_serving_amount DECIMAL NOT NULL DEFAULT 1,
ADD COLUMN reference_serving_unit TEXT NOT NULL DEFAULT 'serving';

-- Update the default values for existing foods
-- Set all existing foods to "per 1 serving" as the default
-- Users can update these individually after running the migration

-- Remove the defaults after initial migration
ALTER TABLE foods
ALTER COLUMN reference_serving_amount DROP DEFAULT,
ALTER COLUMN reference_serving_unit DROP DEFAULT;
