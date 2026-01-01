-- Step 1: Disable RLS on all tables to test
ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE foods DISABLE ROW LEVEL SECURITY;
ALTER TABLE meals DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_consumption DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE food_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view all ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can insert their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can update their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can delete their own ingredients" ON ingredients;

DROP POLICY IF EXISTS "Users can view all foods" ON foods;
DROP POLICY IF EXISTS "Users can insert their own foods" ON foods;
DROP POLICY IF EXISTS "Users can update their own foods" ON foods;
DROP POLICY IF EXISTS "Users can delete their own foods" ON foods;

DROP POLICY IF EXISTS "Users can view all meals" ON meals;
DROP POLICY IF EXISTS "Users can insert their own meals" ON meals;
DROP POLICY IF EXISTS "Users can update their own meals" ON meals;
DROP POLICY IF EXISTS "Users can delete their own meals" ON meals;

DROP POLICY IF EXISTS "Users can view their own consumption" ON user_consumption;
DROP POLICY IF EXISTS "Users can insert their own consumption" ON user_consumption;
DROP POLICY IF EXISTS "Users can update their own consumption" ON user_consumption;
DROP POLICY IF EXISTS "Users can delete their own consumption" ON user_consumption;

DROP POLICY IF EXISTS "Users can view their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON user_goals;

DROP POLICY IF EXISTS "Users can view all food_ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can manage food_ingredients" ON food_ingredients;

DROP POLICY IF EXISTS "Users can view all meal_foods" ON meal_foods;
DROP POLICY IF EXISTS "Users can manage meal_foods" ON meal_foods;

-- Step 3: Re-enable RLS and create simple policies
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;

-- INGREDIENTS
CREATE POLICY "ingredients_select" ON ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_insert" ON ingredients FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "ingredients_update" ON ingredients FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "ingredients_delete" ON ingredients FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- FOODS
CREATE POLICY "foods_select" ON foods FOR SELECT TO authenticated USING (true);
CREATE POLICY "foods_insert" ON foods FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "foods_update" ON foods FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "foods_delete" ON foods FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- MEALS
CREATE POLICY "meals_select" ON meals FOR SELECT TO authenticated USING (true);
CREATE POLICY "meals_insert" ON meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "meals_update" ON meals FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "meals_delete" ON meals FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- USER_CONSUMPTION
CREATE POLICY "consumption_select" ON user_consumption FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "consumption_insert" ON user_consumption FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consumption_update" ON user_consumption FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "consumption_delete" ON user_consumption FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- USER_GOALS
CREATE POLICY "goals_select" ON user_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON user_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON user_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON user_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FOOD_INGREDIENTS (junction table - all authenticated users can access)
CREATE POLICY "food_ingredients_all" ON food_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MEAL_FOODS (junction table - all authenticated users can access)
CREATE POLICY "meal_foods_all" ON meal_foods FOR ALL TO authenticated USING (true) WITH CHECK (true);
