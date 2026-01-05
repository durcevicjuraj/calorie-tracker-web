import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Food {
  id: string
  name: string
  brand_name: string | null
  category: string
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
  reference_serving_amount: number
  reference_serving_unit: string
  image_url: string | null
}

interface MealFood {
  food_id: string
  quantity: string
  unit: string
}

export default function EditMeal() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mealFoods, setMealFoods] = useState<MealFood[]>([])

  // Food search and filter states
  const [foodSearchQuery, setFoodSearchQuery] = useState('')
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('all')
  const [showFoodSelector, setShowFoodSelector] = useState(false)
  const [mealFoodEditIndex, setMealFoodEditIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchFoods()
    if (id) {
      fetchMeal()
    }
  }, [id])

  // Refetch foods when window gains focus (after editing a food)
  useEffect(() => {
    const handleFocus = () => {
      fetchFoods()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  async function fetchFoods() {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, brand_name, category, calories, protein, carbs, sugar, fat, fiber, reference_serving_amount, reference_serving_unit, image_url')
        .order('name')

      if (error) throw error
      setFoods(data || [])
    } catch (e: any) {
      console.error('Error fetching foods:', e)
    }
  }

  // Get unique food categories
  const foodCategories = ['all', ...new Set(foods.map(f => f.category || 'Uncategorized'))]

  // Filter foods for the selector
  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(foodSearchQuery.toLowerCase()) ||
      food.brand_name?.toLowerCase().includes(foodSearchQuery.toLowerCase())
    const matchesCategory = foodCategoryFilter === 'all' || food.category === foodCategoryFilter
    return matchesSearch && matchesCategory
  })

  function selectFood(foodId: string) {
    if (mealFoodEditIndex !== null) {
      // Editing existing food in meal
      const selectedFood = foods.find(f => f.id === foodId)
      if (selectedFood) {
        const availableUnits = getAvailableUnits(selectedFood)
        updateMealFood(mealFoodEditIndex, 'food_id', foodId)
        // Reset to default unit if current unit not available
        const currentFood = mealFoods[mealFoodEditIndex]
        if (!availableUnits.includes(currentFood.unit)) {
          updateMealFood(mealFoodEditIndex, 'unit', availableUnits[0])
        }
      }
      setMealFoodEditIndex(null)
    } else {
      // Adding new food to meal
      setMealFoods([...mealFoods, {
        food_id: foodId,
        quantity: '1',
        unit: 'servings'
      }])
    }
    setShowFoodSelector(false)
    setFoodSearchQuery('')
    setFoodCategoryFilter('all')
  }

  function openFoodSelectorForMeal(index: number | null = null) {
    setMealFoodEditIndex(index)
    setShowFoodSelector(true)
  }

  function calculateMultiplier(quantity: number, unit: string, food: Food): number {
    // If unit is 'servings', use quantity directly as multiplier
    if (unit === 'servings') {
      return quantity
    }

    // If unit matches food's reference unit, calculate multiplier
    if (unit === food.reference_serving_unit) {
      return quantity / food.reference_serving_amount
    }

    // Default: use quantity directly (no conversion)
    return quantity
  }

  function getAvailableUnits(food: Food): string[] {
    // Always allow 'servings'
    const units = ['servings']

    // Add the food's reference unit
    if (food.reference_serving_unit && food.reference_serving_unit !== 'serving') {
      units.push(food.reference_serving_unit)
    }

    return units
  }

  async function fetchMeal() {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*, meal_foods(food_id, quantity, unit)')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setName(data.name)
        setDescription(data.description || '')

        if (data.meal_foods) {
          setMealFoods(data.meal_foods.map((mf: any) => ({
            food_id: mf.food_id,
            quantity: mf.quantity.toString(),
            unit: mf.unit,
          })))
        }
      }
    } catch (e: any) {
      console.error('Error fetching meal:', e)
      setError('Failed to load meal data')
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
    // Sum nutrition from all foods with proper unit conversion
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

      const multiplier = calculateMultiplier(parseFloat(mf.quantity), mf.unit, food)

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

      // Update meal with calculated nutrition
      const { error: updateError } = await supabase
        .from('meals')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          sugar: nutrition.sugar,
          fat: nutrition.fat,
          fiber: nutrition.fiber,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Delete existing meal foods
      await supabase
        .from('meal_foods')
        .delete()
        .eq('meal_id', id)

      // Insert new meal foods
      const mealFoodsData = mealFoods.map(mf => ({
        meal_id: id,
        food_id: mf.food_id,
        quantity: parseFloat(mf.quantity),
        unit: mf.unit,
      }))

      const { error: foodsError } = await supabase
        .from('meal_foods')
        .insert(mealFoodsData)

      if (foodsError) throw foodsError

      navigate('/meals')
    } catch (e: any) {
      setError(e.message || 'Failed to update meal')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this meal? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      navigate('/meals')
    } catch (e: any) {
      setError(e.message || 'Failed to delete meal')
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
            <h1 className="text-xl font-bold">Edit Meal</h1>
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

                {/* Meal Foods List */}
                <div className="space-y-2 mb-3">
                  {mealFoods.map((mf, index) => {
                    const selectedFood = foods.find(f => f.id === mf.food_id)
                    const availableUnits = selectedFood ? getAvailableUnits(selectedFood) : ['servings']

                    return (
                      <div key={index} className="card bg-base-200 shadow-sm">
                        <div className="card-body p-3">
                          <div className="flex items-center gap-3">
                            {selectedFood?.image_url ? (
                              <img
                                src={selectedFood.image_url}
                                alt={selectedFood.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-base-300 rounded flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">🍽️</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {selectedFood?.name || 'Unknown'}
                              </h4>
                              {selectedFood?.brand_name && (
                                <p className="text-xs opacity-60 truncate">{selectedFood.brand_name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                className="input input-bordered input-sm w-20"
                                placeholder="Amount"
                                value={mf.quantity}
                                onChange={(e) => updateMealFood(index, 'quantity', e.target.value)}
                                required
                                min="0"
                                disabled={loading}
                              />
                              <select
                                className="select select-bordered select-sm w-24"
                                value={mf.unit}
                                onChange={(e) => updateMealFood(index, 'unit', e.target.value)}
                                disabled={loading}
                              >
                                {availableUnits.map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => openFoodSelectorForMeal(index)}
                                disabled={loading}
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-square btn-outline btn-error"
                                onClick={() => removeMealFood(index)}
                                disabled={loading}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openFoodSelectorForMeal(null)}
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

              {/* Food Selector Modal */}
              {showFoodSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="card bg-base-100 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    <div className="card-body">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Select Food</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn-circle"
                          onClick={() => {
                            setShowFoodSelector(false)
                            setFoodSearchQuery('')
                            setFoodCategoryFilter('all')
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Search and Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <input
                          type="text"
                          placeholder="Search foods..."
                          className="input input-bordered input-sm w-full"
                          value={foodSearchQuery}
                          onChange={(e) => setFoodSearchQuery(e.target.value)}
                        />
                        <select
                          className="select select-bordered select-sm w-full"
                          value={foodCategoryFilter}
                          onChange={(e) => setFoodCategoryFilter(e.target.value)}
                        >
                          {foodCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat === 'all' ? 'All Categories' : cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Foods Grid */}
                      <div className="overflow-y-auto max-h-[60vh]">
                        {filteredFoods.length === 0 ? (
                          <div className="text-center py-12 opacity-60">
                            <p>No foods found</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredFoods.map((food) => (
                              <div
                                key={food.id}
                                className="card bg-base-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => selectFood(food.id)}
                              >
                                <div className="card-body p-3">
                                  <div className="flex gap-3">
                                    {food.image_url ? (
                                      <img
                                        src={food.image_url}
                                        alt={food.name}
                                        className="w-16 h-16 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 bg-base-300 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">🍽️</span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm truncate">
                                        {food.name}
                                      </h4>
                                      {food.brand_name && (
                                        <p className="text-xs opacity-60 truncate">{food.brand_name}</p>
                                      )}
                                      <p className="text-xs opacity-60 mt-1">
                                        per {food.reference_serving_amount}{food.reference_serving_unit}
                                      </p>
                                      <div className="text-xs opacity-60 mt-1">
                                        <div>{Math.round(food.calories)} kcal</div>
                                        <div className="flex gap-2">
                                          <span>P:{Math.round(food.protein)}g</span>
                                          <span>C:{Math.round(food.carbs)}g</span>
                                          <span>F:{Math.round(food.fat)}g</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && <p className="text-error text-sm">{error}</p>}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-between mt-4">
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => navigate('/meals')}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || mealFoods.length === 0}
                  >
                    {loading ? 'Updating...' : 'Update Meal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
