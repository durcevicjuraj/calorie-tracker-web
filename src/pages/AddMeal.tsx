import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Food {
  id: string
  name: string
  brand_name: string | null
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
}

interface MealFood {
  food_id: string
  quantity: string
  unit: string
}

export default function AddMeal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mealFoods, setMealFoods] = useState<MealFood[]>([])

  const servingUnits = ['g', 'ml', 'cup', 'piece', 'tbsp', 'tsp', 'oz', 'lb']

  useEffect(() => {
    fetchFoods()
  }, [])

  async function fetchFoods() {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, brand_name, calories, protein, carbs, sugar, fat, fiber')
        .order('name')

      if (error) throw error
      setFoods(data || [])
    } catch (e: any) {
      console.error('Error fetching foods:', e)
    }
  }

  function addMealFood() {
    if (foods.length > 0) {
      setMealFoods([...mealFoods, { food_id: foods[0].id, quantity: '100', unit: 'g' }])
    }
  }

  function removeMealFood(index: number) {
    setMealFoods(mealFoods.filter((_, i) => i !== index))
  }

  function updateMealFood(index: number, field: keyof MealFood, value: string) {
    const updated = [...mealFoods]
    updated[index] = { ...updated[index], [field]: value }
    setMealFoods(updated)
  }

  function calculateNutrition() {
    // Sum nutrition from all foods scaled by quantity
    // NOTE: Quantity represents a multiplier (e.g., 2 = 2x the food's nutrition)
    // This assumes each food's nutrition is for "1 serving" and quantity scales it
    let totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      sugar: 0,
      fat: 0,
      fiber: 0
    }

    mealFoods.forEach(mf => {
      const food = foods.find(f => f.id === mf.food_id)
      if (!food) return

      const multiplier = parseFloat(mf.quantity)

      totals.calories += food.calories * multiplier
      totals.protein += food.protein * multiplier
      totals.carbs += food.carbs * multiplier
      totals.sugar += (food.sugar || 0) * multiplier
      totals.fat += food.fat * multiplier
      totals.fiber += (food.fiber || 0) * multiplier
    })

    return {
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      sugar: totals.sugar > 0 ? totals.sugar : null,
      fat: totals.fat,
      fiber: totals.fiber > 0 ? totals.fiber : null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || loading) return

    if (mealFoods.length === 0) {
      setError('Please add at least one food to the meal')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Calculate nutrition from foods
      const nutrition = calculateNutrition()

      // Insert meal with calculated nutrition
      const { data: mealData, error: insertError } = await supabase
        .from('meals')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          sugar: nutrition.sugar,
          fat: nutrition.fat,
          fiber: nutrition.fiber,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Insert meal foods
      const mealFoodsData = mealFoods.map(mf => ({
        meal_id: mealData.id,
        food_id: mf.food_id,
        quantity: parseFloat(mf.quantity),
        unit: mf.unit,
      }))

      const { error: foodsError } = await supabase
        .from('meal_foods')
        .insert(mealFoodsData)

      if (foodsError) throw foodsError

      navigate('/')
    } catch (e: any) {
      setError(e.message || 'Failed to add meal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-base-200">
      {/* Header */}
      <header className="bg-base-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="btn btn-ghost btn-sm mr-4"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">Add Meal</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Meal Name */}
              <div>
                <label className="label">
                  <span className="label-text">Meal Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., Breakfast Bowl, Sunday Brunch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">
                  <span className="label-text">Description (Optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Add any notes about this meal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* Foods */}
              <div>
                <label className="label">
                  <span className="label-text">Foods in this Meal</span>
                </label>
                {mealFoods.length === 0 && (
                  <p className="text-sm opacity-60 mb-2">
                    No foods added yet. Click "Add Food" to start building your meal.
                  </p>
                )}
                {mealFoods.map((mf, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select
                      className="select select-bordered flex-1"
                      value={mf.food_id}
                      onChange={(e) => updateMealFood(index, 'food_id', e.target.value)}
                      required
                      disabled={loading}
                    >
                      {foods.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.name} {food.brand_name ? `(${food.brand_name})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-24"
                      value={mf.quantity}
                      onChange={(e) => updateMealFood(index, 'quantity', e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
                    <select
                      className="select select-bordered w-24"
                      value={mf.unit}
                      onChange={(e) => updateMealFood(index, 'unit', e.target.value)}
                      disabled={loading}
                    >
                      {servingUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-square btn-outline btn-error"
                      onClick={() => removeMealFood(index)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-outline btn-sm mt-2"
                  onClick={addMealFood}
                  disabled={loading || foods.length === 0}
                >
                  + Add Food
                </button>
                {foods.length === 0 && (
                  <p className="text-sm text-warning mt-2">
                    No foods available. Add foods first before creating meals.
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && <p className="text-error text-sm">{error}</p>}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate('/')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || mealFoods.length === 0}
                >
                  {loading ? 'Adding...' : 'Add Meal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
