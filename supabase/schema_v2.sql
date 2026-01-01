-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ingredient', 'food', 'meal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, type)
);

-- Predefined categories
INSERT INTO categories (name, type) VALUES
  ('Protein', 'ingredient'),
  ('Vegetables', 'ingredient'),
  ('Fruits', 'ingredient'),
  ('Grains', 'ingredient'),
  ('Dairy', 'ingredient'),
  ('Fats & Oils', 'ingredient'),
  ('Beverages', 'ingredient'),
  ('Snacks', 'ingredient'),
  ('Other', 'ingredient'),
  ('Breakfast', 'food'),
  ('Lunch', 'food'),
  ('Dinner', 'food'),
  ('Snack', 'food'),
  ('Beverage', 'food'),
  ('Dessert', 'food'),
  ('Other', 'food');

-- ============================================================================
-- INGREDIENTS TABLE
-- ============================================================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand_name TEXT,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Nutritional information per serving
  serving_amount DECIMAL(10, 2) NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
  protein DECIMAL(10, 2) NOT NULL DEFAULT 0,
  carbs DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sugar DECIMAL(10, 2) DEFAULT NULL,
  fat DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fiber DECIMAL(10, 2) DEFAULT NULL,

  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT calories_positive CHECK (calories >= 0),
  CONSTRAINT protein_positive CHECK (protein >= 0),
  CONSTRAINT carbs_positive CHECK (carbs >= 0),
  CONSTRAINT sugar_positive CHECK (sugar IS NULL OR sugar >= 0),
  CONSTRAINT fat_positive CHECK (fat >= 0),
  CONSTRAINT fiber_positive CHECK (fiber IS NULL OR fiber >= 0),
  CONSTRAINT serving_amount_positive CHECK (serving_amount > 0)
);

CREATE INDEX idx_ingredients_created_by ON ingredients(created_by);
CREATE INDEX idx_ingredients_category ON ingredients(category_id);

-- ============================================================================
-- FOODS TABLE
-- ============================================================================
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand_name TEXT,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Calculated and stored nutritional information
  -- These are calculated from ingredients and saved
  calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
  protein DECIMAL(10, 2) NOT NULL DEFAULT 0,
  carbs DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sugar DECIMAL(10, 2) DEFAULT NULL,
  fat DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fiber DECIMAL(10, 2) DEFAULT NULL,

  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT calories_positive CHECK (calories >= 0),
  CONSTRAINT protein_positive CHECK (protein >= 0),
  CONSTRAINT carbs_positive CHECK (carbs >= 0),
  CONSTRAINT sugar_positive CHECK (sugar IS NULL OR sugar >= 0),
  CONSTRAINT fat_positive CHECK (fat >= 0),
  CONSTRAINT fiber_positive CHECK (fiber IS NULL OR fiber >= 0)
);

CREATE INDEX idx_foods_created_by ON foods(created_by);
CREATE INDEX idx_foods_category ON foods(category_id);

-- ============================================================================
-- FOOD_INGREDIENTS TABLE (Junction table)
-- ============================================================================
CREATE TABLE food_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT quantity_positive CHECK (quantity > 0),
  UNIQUE(food_id, ingredient_id)
);

CREATE INDEX idx_food_ingredients_food ON food_ingredients(food_id);
CREATE INDEX idx_food_ingredients_ingredient ON food_ingredients(ingredient_id);

-- ============================================================================
-- MEALS TABLE
-- ============================================================================
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  -- Calculated and stored nutritional information
  -- These are calculated from foods and saved
  calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
  protein DECIMAL(10, 2) NOT NULL DEFAULT 0,
  carbs DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sugar DECIMAL(10, 2) DEFAULT NULL,
  fat DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fiber DECIMAL(10, 2) DEFAULT NULL,

  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT calories_positive CHECK (calories >= 0),
  CONSTRAINT protein_positive CHECK (protein >= 0),
  CONSTRAINT carbs_positive CHECK (carbs >= 0),
  CONSTRAINT sugar_positive CHECK (sugar IS NULL OR sugar >= 0),
  CONSTRAINT fat_positive CHECK (fat >= 0),
  CONSTRAINT fiber_positive CHECK (fiber IS NULL OR fiber >= 0)
);

CREATE INDEX idx_meals_created_by ON meals(created_by);

-- ============================================================================
-- MEAL_FOODS TABLE (Junction table)
-- ============================================================================
CREATE TABLE meal_foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT quantity_positive CHECK (quantity > 0),
  UNIQUE(meal_id, food_id)
);

CREATE INDEX idx_meal_foods_meal ON meal_foods(meal_id);
CREATE INDEX idx_meal_foods_food ON meal_foods(food_id);

-- ============================================================================
-- USER_CONSUMPTION TABLE
-- ============================================================================
CREATE TABLE user_consumption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reference to meal (can be null if meal is deleted)
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  meal_name TEXT NOT NULL,

  -- SAVED nutritional snapshot (calculated at log time)
  calories DECIMAL(10, 2) NOT NULL,
  protein DECIMAL(10, 2) NOT NULL,
  carbs DECIMAL(10, 2) NOT NULL,
  sugar DECIMAL(10, 2),
  fat DECIMAL(10, 2) NOT NULL,
  fiber DECIMAL(10, 2),

  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT calories_positive CHECK (calories >= 0),
  CONSTRAINT protein_positive CHECK (protein >= 0),
  CONSTRAINT carbs_positive CHECK (carbs >= 0),
  CONSTRAINT sugar_positive CHECK (sugar IS NULL OR sugar >= 0),
  CONSTRAINT fat_positive CHECK (fat >= 0),
  CONSTRAINT fiber_positive CHECK (fiber IS NULL OR fiber >= 0)
);

CREATE INDEX idx_user_consumption_user ON user_consumption(user_id);
CREATE INDEX idx_user_consumption_meal ON user_consumption(meal_id);
CREATE INDEX idx_user_consumption_consumed_at ON user_consumption(consumed_at);

-- ============================================================================
-- USER_GOALS TABLE
-- ============================================================================
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  daily_calorie_goal DECIMAL(10, 2) NOT NULL DEFAULT 2000,
  daily_protein_goal DECIMAL(10, 2) NOT NULL DEFAULT 150,
  daily_carbs_goal DECIMAL(10, 2) NOT NULL DEFAULT 200,
  daily_sugar_goal DECIMAL(10, 2) DEFAULT NULL,
  daily_fat_goal DECIMAL(10, 2) NOT NULL DEFAULT 65,
  daily_fiber_goal DECIMAL(10, 2) DEFAULT NULL,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT calorie_goal_positive CHECK (daily_calorie_goal > 0),
  CONSTRAINT protein_goal_positive CHECK (daily_protein_goal > 0),
  CONSTRAINT carbs_goal_positive CHECK (daily_carbs_goal > 0),
  CONSTRAINT sugar_goal_positive CHECK (daily_sugar_goal IS NULL OR daily_sugar_goal > 0),
  CONSTRAINT fat_goal_positive CHECK (daily_fat_goal > 0),
  CONSTRAINT fiber_goal_positive CHECK (daily_fiber_goal IS NULL OR daily_fiber_goal > 0)
);

CREATE INDEX idx_user_goals_user ON user_goals(user_id);

-- ============================================================================
-- USER_PROFILES TABLE
-- ============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories: Everyone can read
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Ingredients: Everyone can view, only creator can modify
CREATE POLICY "Ingredients are viewable by everyone"
  ON ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own ingredients"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own ingredients"
  ON ingredients FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own ingredients"
  ON ingredients FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Foods: Everyone can view, only creator can modify
CREATE POLICY "Foods are viewable by everyone"
  ON foods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own foods"
  ON foods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own foods"
  ON foods FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own foods"
  ON foods FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Food Ingredients: Viewable by all, modifiable by food creator
CREATE POLICY "Food ingredients are viewable by everyone"
  ON food_ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their food ingredients"
  ON food_ingredients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM foods
      WHERE foods.id = food_ingredients.food_id
      AND foods.created_by = auth.uid()
    )
  );

-- Meals: Everyone can view, only creator can modify
CREATE POLICY "Meals are viewable by everyone"
  ON meals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own meals"
  ON meals FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Meal Foods: Viewable by all, modifiable by meal creator
CREATE POLICY "Meal foods are viewable by everyone"
  ON meal_foods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their meal foods"
  ON meal_foods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_foods.meal_id
      AND meals.created_by = auth.uid()
    )
  );

-- User Consumption: Users can only see and manage their own
CREATE POLICY "Users can view their own consumption"
  ON user_consumption FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consumption"
  ON user_consumption FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consumption"
  ON user_consumption FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consumption"
  ON user_consumption FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- User Goals: Users can only see and manage their own
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON user_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- User Profiles: Users can only see and manage their own
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  INSERT INTO public.user_goals (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STORAGE BUCKET FOR IMAGES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload food images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to food images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own food images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own food images" ON storage.objects;

-- Storage policies
CREATE POLICY "Allow authenticated users to upload food images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images');

CREATE POLICY "Allow public read access to food images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'food-images');

CREATE POLICY "Allow users to update their own food images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'food-images');

CREATE POLICY "Allow users to delete their own food images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'food-images');
