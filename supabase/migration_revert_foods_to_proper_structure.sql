-- Migration: Revert foods table to proper structure
-- This removes direct nutritional fields from foods (they belong in ingredients)
-- Run this in your Supabase SQL Editor

-- Remove nutritional columns from foods table (they belong in ingredients)
ALTER TABLE foods DROP COLUMN IF EXISTS serving_size;
ALTER TABLE foods DROP COLUMN IF EXISTS calories;
ALTER TABLE foods DROP COLUMN IF EXISTS protein;
ALTER TABLE foods DROP COLUMN IF EXISTS carbs;
ALTER TABLE foods DROP COLUMN IF EXISTS fat;
ALTER TABLE foods DROP COLUMN IF EXISTS fiber;

-- Drop the nutritional constraints we added
ALTER TABLE foods DROP CONSTRAINT IF EXISTS calories_positive;
ALTER TABLE foods DROP CONSTRAINT IF EXISTS protein_positive;
ALTER TABLE foods DROP CONSTRAINT IF EXISTS carbs_positive;
ALTER TABLE foods DROP CONSTRAINT IF EXISTS fat_positive;
ALTER TABLE foods DROP CONSTRAINT IF EXISTS fiber_positive;

-- Keep brand_name and image_url in foods (makes sense for branded products)
-- These are already added, no action needed

-- Add brand_name and image_url to ingredients table as well
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT NULL;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Update ingredients table to use serving_size instead of standard_serving_amount/unit
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS serving_size TEXT DEFAULT '100g';
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS fiber DECIMAL(10, 2) DEFAULT NULL;

-- Re-add the constraint for simple vs composite foods
-- But make it optional to allow foods without ingredients initially
ALTER TABLE foods DROP CONSTRAINT IF EXISTS simple_food_has_ingredient;

-- Storage bucket and policies remain (already created)
-- The food-images bucket can store images for both ingredients and foods
