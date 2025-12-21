-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SHARED TABLES (visible to all users)
-- ============================================================================

-- Categories table (shared across all users)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_predefined BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert predefined categories
INSERT INTO categories (name, is_predefined) VALUES
  ('Fruit', TRUE),
  ('Vegetable', TRUE),
  ('Drink', TRUE),
  ('Food', TRUE),
  ('Snack', TRUE),
  ('Dairy', TRUE),
  ('Protein', TRUE),
  ('Grain', TRUE),
  ('Dessert', TRUE);

-- Ingredients table (base items with nutritional data)
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  -- Nutritional data per standard unit (e.g., per 100g)
  calories DECIMAL(10, 2) NOT NULL,
  protein DECIMAL(10, 2) DEFAULT 0,
  carbs DECIMAL(10, 2) DEFAULT 0,
  fat DECIMAL(10, 2) DEFAULT 0,
  -- Standard serving info
  standard_serving_amount DECIMAL(10, 2) NOT NULL DEFAULT 100,
  standard_serving_unit TEXT NOT NULL DEFAULT 'g',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT calories_positive CHECK (calories >= 0),
  CONSTRAINT protein_positive CHECK (protein >= 0),
  CONSTRAINT carbs_positive CHECK (carbs >= 0),
  CONSTRAINT fat_positive CHECK (fat >= 0),
  CONSTRAINT standard_serving_positive CHECK (standard_serving_amount > 0)
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category_id);

-- Foods table (can be simple or composite)
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_composite BOOLEAN DEFAULT FALSE,
  -- If simple food, reference the ingredient
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT simple_food_has_ingredient CHECK (
    (is_composite = FALSE AND ingredient_id IS NOT NULL) OR
    (is_composite = TRUE AND ingredient_id IS NULL)
  )
);

CREATE INDEX idx_foods_name ON foods(name);
CREATE INDEX idx_foods_category ON foods(category_id);
CREATE INDEX idx_foods_composite ON foods(is_composite);

-- Food ingredients (for composite foods like sandwiches)
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

-- Meals table (collection of foods)
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_meals_name ON meals(name);
CREATE INDEX idx_meals_type ON meals(meal_type);

-- Meal foods (foods in a meal with quantities)
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
-- USER-SPECIFIC TABLES
-- ============================================================================

-- User consumption (what user actually ate)
CREATE TABLE user_consumption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- User can log either a meal or individual food
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
  -- Quantity (if logging individual food)
  quantity DECIMAL(10, 2),
  unit TEXT,
  -- When they ate it
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT consumption_has_meal_or_food CHECK (
    (meal_id IS NOT NULL AND food_id IS NULL) OR
    (meal_id IS NULL AND food_id IS NOT NULL)
  ),
  CONSTRAINT food_has_quantity CHECK (
    (food_id IS NOT NULL AND quantity IS NOT NULL AND quantity > 0 AND unit IS NOT NULL) OR
    (food_id IS NULL)
  )
);

CREATE INDEX idx_user_consumption_user ON user_consumption(user_id);
CREATE INDEX idx_user_consumption_date ON user_consumption(date);
CREATE INDEX idx_user_consumption_user_date ON user_consumption(user_id, date);

-- User goals table (user-specific)
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calorie_goal DECIMAL(10, 2) NOT NULL,
  daily_protein_goal DECIMAL(10, 2) DEFAULT 0,
  daily_carbs_goal DECIMAL(10, 2) DEFAULT 0,
  daily_fat_goal DECIMAL(10, 2) DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT daily_calorie_goal_positive CHECK (daily_calorie_goal > 0),
  CONSTRAINT daily_protein_goal_positive CHECK (daily_protein_goal >= 0),
  CONSTRAINT daily_carbs_goal_positive CHECK (daily_carbs_goal >= 0),
  CONSTRAINT daily_fat_goal_positive CHECK (daily_fat_goal >= 0),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_user_goals_user ON user_goals(user_id);
CREATE INDEX idx_user_goals_active ON user_goals(user_id, is_active);

-- User profiles table (additional user information)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR SHARED TABLES (all users can view, authenticated can create)
-- ============================================================================

-- Categories policies
CREATE POLICY "Categories are viewable by authenticated users"
  ON categories FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create custom categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_predefined = FALSE);

CREATE POLICY "Users can delete their own custom categories"
  ON categories FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND is_predefined = FALSE);

-- Ingredients policies
CREATE POLICY "Ingredients are viewable by authenticated users"
  ON ingredients FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create ingredients"
  ON ingredients FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own ingredients"
  ON ingredients FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own ingredients"
  ON ingredients FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Foods policies
CREATE POLICY "Foods are viewable by authenticated users"
  ON foods FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create foods"
  ON foods FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own foods"
  ON foods FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own foods"
  ON foods FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Food ingredients policies
CREATE POLICY "Food ingredients are viewable by authenticated users"
  ON food_ingredients FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create food ingredients"
  ON food_ingredients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM foods
      WHERE foods.id = food_ingredients.food_id
      AND foods.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own food ingredients"
  ON food_ingredients FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM foods
      WHERE foods.id = food_ingredients.food_id
      AND foods.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own food ingredients"
  ON food_ingredients FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM foods
      WHERE foods.id = food_ingredients.food_id
      AND foods.created_by = auth.uid()
    )
  );

-- Meals policies
CREATE POLICY "Meals are viewable by authenticated users"
  ON meals FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create meals"
  ON meals FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own meals"
  ON meals FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own meals"
  ON meals FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Meal foods policies
CREATE POLICY "Meal foods are viewable by authenticated users"
  ON meal_foods FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create meal foods"
  ON meal_foods FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_foods.meal_id
      AND meals.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own meal foods"
  ON meal_foods FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_foods.meal_id
      AND meals.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own meal foods"
  ON meal_foods FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_foods.meal_id
      AND meals.created_by = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES FOR USER-SPECIFIC TABLES
-- ============================================================================

-- User consumption policies
CREATE POLICY "Users can view their own consumption"
  ON user_consumption FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own consumption"
  ON user_consumption FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own consumption"
  ON user_consumption FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own consumption"
  ON user_consumption FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- User goals policies
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own goals"
  ON user_goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- User profiles policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own profile"
  ON user_profiles FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_goals
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
