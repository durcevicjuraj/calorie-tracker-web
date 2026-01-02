-- Create table to store daily nutrition snapshots (goals + actual consumption)
-- This preserves historical data even when goals change
-- Data older than 90 days will be automatically cleaned up

CREATE TABLE daily_nutrition_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,

  -- Goals for this day (snapshot of user's goals at the time)
  calories_goal DECIMAL NOT NULL,
  protein_goal DECIMAL NOT NULL,
  carbs_goal DECIMAL NOT NULL,
  fat_goal DECIMAL NOT NULL,
  sugar_goal DECIMAL,
  fiber_goal DECIMAL,

  -- Actual consumption for this day
  calories_consumed DECIMAL NOT NULL DEFAULT 0,
  protein_consumed DECIMAL NOT NULL DEFAULT 0,
  carbs_consumed DECIMAL NOT NULL DEFAULT 0,
  fat_consumed DECIMAL NOT NULL DEFAULT 0,
  sugar_consumed DECIMAL NOT NULL DEFAULT 0,
  fiber_consumed DECIMAL NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one snapshot per user per day
  UNIQUE(user_id, log_date)
);

-- Add index for faster queries
CREATE INDEX idx_daily_nutrition_snapshots_user_date ON daily_nutrition_snapshots(user_id, log_date DESC);

-- Enable RLS
ALTER TABLE daily_nutrition_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own snapshots"
  ON daily_nutrition_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON daily_nutrition_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON daily_nutrition_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON daily_nutrition_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically delete snapshots older than 90 days
CREATE OR REPLACE FUNCTION delete_old_nutrition_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM daily_nutrition_snapshots
  WHERE log_date < CURRENT_DATE - INTERVAL '90 days';
END;
$$;

-- This function can be called manually or scheduled
-- For now, we'll call it from the application when viewing history
