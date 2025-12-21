-- Migration: Add brand_name, image_url, and nutritional fields to foods table
-- Run this in your Supabase SQL Editor

-- Drop the constraint that requires ingredient_id
ALTER TABLE foods DROP CONSTRAINT IF EXISTS simple_food_has_ingredient;

-- Add new columns to foods table
ALTER TABLE foods ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT NULL;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS serving_size TEXT DEFAULT '100g';
ALTER TABLE foods ADD COLUMN IF NOT EXISTS calories DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS protein DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS carbs DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS fat DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS fiber DECIMAL(10, 2) DEFAULT NULL;

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calories_positive' AND conrelid = 'foods'::regclass
  ) THEN
    ALTER TABLE foods ADD CONSTRAINT calories_positive CHECK (calories >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'protein_positive' AND conrelid = 'foods'::regclass
  ) THEN
    ALTER TABLE foods ADD CONSTRAINT protein_positive CHECK (protein >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'carbs_positive' AND conrelid = 'foods'::regclass
  ) THEN
    ALTER TABLE foods ADD CONSTRAINT carbs_positive CHECK (carbs >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fat_positive' AND conrelid = 'foods'::regclass
  ) THEN
    ALTER TABLE foods ADD CONSTRAINT fat_positive CHECK (fat >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fiber_positive' AND conrelid = 'foods'::regclass
  ) THEN
    ALTER TABLE foods ADD CONSTRAINT fiber_positive CHECK (fiber IS NULL OR fiber >= 0);
  END IF;
END $$;

-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
DO $$
BEGIN
  -- Allow authenticated users to upload food images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to upload food images'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload food images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'food-images');
  END IF;

  -- Allow public to read food images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow public to read food images'
  ) THEN
    CREATE POLICY "Allow public to read food images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'food-images');
  END IF;

  -- Allow authenticated users to update food images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to update food images'
  ) THEN
    CREATE POLICY "Allow authenticated users to update food images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'food-images');
  END IF;

  -- Allow authenticated users to delete food images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to delete food images'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete food images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'food-images');
  END IF;
END $$;
