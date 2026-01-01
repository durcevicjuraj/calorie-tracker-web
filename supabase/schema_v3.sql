-- CALORIE TRACKER V3 SCHEMA
-- SIMPLE AND CLEAN

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------
-- INGREDIENTS TABLE
--------------------
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand_name TEXT,
  description TEXT,
  category TEXT NOT NULL,
  serving_amount DECIMAL NOT NULL CHECK (serving_amount > 0),
  serving_unit TEXT NOT NULL,
  calories DECIMAL NOT NULL CHECK (calories >= 0),
  protein DECIMAL NOT NULL CHECK (protein >= 0),
  carbs DECIMAL NOT NULL CHECK (carbs >= 0),
  sugar DECIMAL CHECK (sugar >= 0),
  fat DECIMAL NOT NULL CHECK (fat >= 0),
  fiber DECIMAL CHECK (fiber >= 0),
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

--------------------
-- FOODS TABLE
--------------------
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand_name TEXT,
  description TEXT,
  category TEXT NOT NULL,
  calories DECIMAL NOT NULL CHECK (calories >= 0),
  protein DECIMAL NOT NULL CHECK (protein >= 0),
  carbs DECIMAL NOT NULL CHECK (carbs >= 0),
  sugar DECIMAL CHECK (sugar >= 0),
  fat DECIMAL NOT NULL CHECK (fat >= 0),
  fiber DECIMAL CHECK (fiber >= 0),
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

--------------------
-- FOOD_INGREDIENTS (Junction)
--------------------
CREATE TABLE food_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL
);

--------------------
-- MEALS TABLE
--------------------
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  calories DECIMAL NOT NULL CHECK (calories >= 0),
  protein DECIMAL NOT NULL CHECK (protein >= 0),
  carbs DECIMAL NOT NULL CHECK (carbs >= 0),
  sugar DECIMAL CHECK (sugar >= 0),
  fat DECIMAL NOT NULL CHECK (fat >= 0),
  fiber DECIMAL CHECK (fiber >= 0),
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

--------------------
-- MEAL_FOODS (Junction)
--------------------
CREATE TABLE meal_foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  quantity DECIMAL NOT NULL CHECK (quantity > 0)
);

--------------------
-- USER_CONSUMPTION
--------------------
CREATE TABLE user_consumption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  quantity DECIMAL NOT NULL CHECK (quantity > 0),
  calories DECIMAL NOT NULL CHECK (calories >= 0),
  protein DECIMAL NOT NULL CHECK (protein >= 0),
  carbs DECIMAL NOT NULL CHECK (carbs >= 0),
  sugar DECIMAL CHECK (sugar >= 0),
  fat DECIMAL NOT NULL CHECK (fat >= 0),
  fiber DECIMAL CHECK (fiber >= 0),
  consumed_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

--------------------
-- USER_GOALS
--------------------
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  calories DECIMAL NOT NULL CHECK (calories >= 0),
  protein DECIMAL NOT NULL CHECK (protein >= 0),
  carbs DECIMAL NOT NULL CHECK (carbs >= 0),
  sugar DECIMAL CHECK (sugar >= 0),
  fat DECIMAL NOT NULL CHECK (fat >= 0),
  fiber DECIMAL CHECK (fiber >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

--------------------
-- INDEXES
--------------------
CREATE INDEX idx_ingredients_created_by ON ingredients(created_by);
CREATE INDEX idx_foods_created_by ON foods(created_by);
CREATE INDEX idx_meals_created_by ON meals(created_by);
CREATE INDEX idx_user_consumption_user_date ON user_consumption(user_id, consumed_date);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);

--------------------
-- ENABLE RLS
--------------------
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

--------------------
-- RLS POLICIES (SIMPLE - EVERYONE CAN DO EVERYTHING)
--------------------

-- INGREDIENTS: Everyone can do everything
CREATE POLICY "ingredients_all" ON ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FOODS: Everyone can do everything
CREATE POLICY "foods_all" ON foods FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MEALS: Everyone can do everything
CREATE POLICY "meals_all" ON meals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FOOD_INGREDIENTS: Everyone can do everything
CREATE POLICY "food_ingredients_all" ON food_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MEAL_FOODS: Everyone can do everything
CREATE POLICY "meal_foods_all" ON meal_foods FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- USER_CONSUMPTION: Only owner can see and modify
CREATE POLICY "consumption_select" ON user_consumption FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "consumption_insert" ON user_consumption FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consumption_update" ON user_consumption FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "consumption_delete" ON user_consumption FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- USER_GOALS: Only owner can see and modify
CREATE POLICY "goals_select" ON user_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON user_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON user_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON user_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
