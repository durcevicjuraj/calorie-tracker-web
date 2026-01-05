import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Meal {
  id: string
  name: string
  description: string | null
  image_url: string | null
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
}

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

interface MealFoodWithDetails {
  food_id: string
  quantity: number
  unit: string
  food: Food
}

export default function LogMeal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Entry mode: 'meal' or 'manual' or 'create'
  const [entryMode, setEntryMode] = useState<'meal' | 'manual' | 'create'>('meal')

  // Form fields for meal selection
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [mealFoods, setMealFoods] = useState<MealFoodWithDetails[]>([])
  const [originalMealFoodIds, setOriginalMealFoodIds] = useState<string[]>([])
  const [showMealSelector, setShowMealSelector] = useState(false)
  const [mealSearchQuery, setMealSearchQuery] = useState('')
  const [consumedDate, setConsumedDate] = useState('')
  const [notes, setNotes] = useState('')

  // Food selector for adding extra foods
  const [allFoods, setAllFoods] = useState<Food[]>([])
  const [showFoodSelector, setShowFoodSelector] = useState(false)
  const [foodSearchQuery, setFoodSearchQuery] = useState('')
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('all')

  // Form fields for manual entry
  const [manualName, setManualName] = useState('')
  const [manualCalories, setManualCalories] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFat, setManualFat] = useState('')
  const [manualSugar, setManualSugar] = useState('')
  const [manualFiber, setManualFiber] = useState('')

  // Form fields for creating a meal
  const [createMealName, setCreateMealName] = useState('')
  const [createMealDescription, setCreateMealDescription] = useState('')
  const [createMealFoods, setCreateMealFoods] = useState<MealFoodWithDetails[]>([])

  useEffect(() => {
    // Set default consumed_date to today
    const today = new Date().toISOString().split('T')[0]
    setConsumedDate(today)

    fetchMeals()
    fetchAllFoods()
  }, [])

  async function fetchMeals() {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('id, name, description, image_url, calories, protein, carbs, sugar, fat, fiber')
        .order('name')

      if (error) throw error
      setMeals(data || [])
    } catch (e: any) {
      console.error('Error fetching meals:', e)
    }
  }

  async function fetchAllFoods() {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, brand_name, category, calories, protein, carbs, sugar, fat, fiber, reference_serving_amount, reference_serving_unit, image_url')
        .order('name')

      if (error) throw error
      setAllFoods(data || [])
    } catch (e: any) {
      console.error('Error fetching foods:', e)
    }
  }

  async function selectMeal(mealId: string) {
    try {
      const meal = meals.find(m => m.id === mealId)
      if (!meal) return

      // Fetch meal foods with food details
      const { data: mealFoodsData, error } = await supabase
        .from('meal_foods')
        .select(`
          food_id,
          quantity,
          unit,
          foods (
            id,
            name,
            brand_name,
            category,
            calories,
            protein,
            carbs,
            sugar,
            fat,
            fiber,
            reference_serving_amount,
            reference_serving_unit,
            image_url
          )
        `)
        .eq('meal_id', mealId)

      if (error) throw error

      const mealFoodsWithDetails: MealFoodWithDetails[] = (mealFoodsData || []).map((mf: any) => ({
        food_id: mf.food_id,
        quantity: mf.quantity,
        unit: mf.unit,
        food: mf.foods
      }))

      setSelectedMeal(meal)
      setMealFoods(mealFoodsWithDetails)
      setOriginalMealFoodIds(mealFoodsWithDetails.map(mf => mf.food_id))
      setShowMealSelector(false)
      setMealSearchQuery('')
    } catch (e: any) {
      console.error('Error fetching meal foods:', e)
    }
  }

  function addExtraFood(foodId: string) {
    const food = allFoods.find(f => f.id === foodId)
    if (!food) return

    const newMealFood: MealFoodWithDetails = {
      food_id: foodId,
      quantity: 1,
      unit: 'servings',
      food: food
    }

    if (entryMode === 'create') {
      setCreateMealFoods([...createMealFoods, newMealFood])
    } else {
      setMealFoods([...mealFoods, newMealFood])
    }
    setShowFoodSelector(false)
    setFoodSearchQuery('')
    setFoodCategoryFilter('all')
  }

  function updateCreateMealFoodQuantity(index: number, newQuantity: string) {
    const updated = [...createMealFoods]
    updated[index].quantity = parseFloat(newQuantity) || 0
    setCreateMealFoods(updated)
  }

  function updateCreateMealFoodUnit(index: number, newUnit: string) {
    const updated = [...createMealFoods]
    updated[index].unit = newUnit
    setCreateMealFoods(updated)
  }

  function removeCreateMealFood(index: number) {
    setCreateMealFoods(createMealFoods.filter((_, i) => i !== index))
  }

  function calculateCreateMealNutrition() {
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let totalSugar = 0
    let totalFiber = 0

    createMealFoods.forEach(mf => {
      const multiplier = calculateMultiplier(mf.quantity, mf.unit, mf.food)
      totalCalories += mf.food.calories * multiplier
      totalProtein += mf.food.protein * multiplier
      totalCarbs += mf.food.carbs * multiplier
      totalFat += mf.food.fat * multiplier
      totalSugar += (mf.food.sugar || 0) * multiplier
      totalFiber += (mf.food.fiber || 0) * multiplier
    })

    return {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      sugar: totalSugar,
      fiber: totalFiber
    }
  }

  function removeExtraFood(foodId: string) {
    // Only allow removing foods that weren't part of the original meal
    if (originalMealFoodIds.includes(foodId)) return
    setMealFoods(mealFoods.filter(mf => mf.food_id !== foodId))
  }

  const foodCategories = ['all', ...new Set(allFoods.map(f => f.category || 'Uncategorized'))]

  const filteredFoods = allFoods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(foodSearchQuery.toLowerCase()) ||
      food.brand_name?.toLowerCase().includes(foodSearchQuery.toLowerCase())
    const matchesCategory = foodCategoryFilter === 'all' || food.category === foodCategoryFilter
    return matchesSearch && matchesCategory
  })

  function calculateMultiplier(quantity: number, unit: string, food: Food): number {
    if (unit === 'servings') {
      return quantity
    }
    if (unit === food.reference_serving_unit) {
      return quantity / food.reference_serving_amount
    }
    return quantity
  }

  function getAvailableUnits(food: Food): string[] {
    const units = ['servings']
    if (food.reference_serving_unit && food.reference_serving_unit !== 'serving') {
      units.push(food.reference_serving_unit)
    }
    return units
  }

  function updateMealFoodQuantity(index: number, newQuantity: string) {
    const updated = [...mealFoods]
    updated[index].quantity = parseFloat(newQuantity) || 0
    setMealFoods(updated)
  }

  function updateMealFoodUnit(index: number, newUnit: string) {
    const updated = [...mealFoods]
    updated[index].unit = newUnit
    setMealFoods(updated)
  }

  function calculateTotalNutrition() {
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let totalSugar = 0
    let totalFiber = 0

    mealFoods.forEach(mf => {
      const multiplier = calculateMultiplier(mf.quantity, mf.unit, mf.food)
      totalCalories += mf.food.calories * multiplier
      totalProtein += mf.food.protein * multiplier
      totalCarbs += mf.food.carbs * multiplier
      totalFat += mf.food.fat * multiplier
      totalSugar += (mf.food.sugar || 0) * multiplier
      totalFiber += (mf.food.fiber || 0) * multiplier
    })

    return {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      sugar: totalSugar,
      fiber: totalFiber
    }
  }

  const filteredMeals = meals.filter(meal =>
    meal.name.toLowerCase().includes(mealSearchQuery.toLowerCase())
  )

  async function handleSaveAndLog(e: React.FormEvent) {
    e.preventDefault()
    if (!user || loading || entryMode !== 'create') return

    if (!createMealName.trim()) {
      setError('Please enter a meal name to save')
      return
    }

    if (createMealFoods.length === 0) {
      setError('Please add at least one food to the meal')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Calculate nutrition for the new meal
      const totals = calculateCreateMealNutrition()

      // Save the meal
      const { data: newMeal, error: mealError } = await supabase
        .from('meals')
        .insert({
          created_by: user.id,
          name: createMealName.trim(),
          description: createMealDescription.trim() || null,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          sugar: totals.sugar > 0 ? totals.sugar : null,
          fat: totals.fat,
          fiber: totals.fiber > 0 ? totals.fiber : null,
        })
        .select()
        .single()

      if (mealError) throw mealError

      // Save meal foods
      const mealFoodsToInsert = createMealFoods.map(mf => ({
        meal_id: newMeal.id,
        food_id: mf.food_id,
        quantity: mf.quantity,
        unit: mf.unit
      }))

      const { error: mealFoodsError } = await supabase
        .from('meal_foods')
        .insert(mealFoodsToInsert)

      if (mealFoodsError) throw mealFoodsError

      // Now log the consumption
      const { error: insertError } = await supabase
        .from('user_consumption')
        .insert({
          user_id: user.id,
          meal_id: newMeal.id,
          meal_name: newMeal.name,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          sugar: totals.sugar > 0 ? totals.sugar : null,
          fat: totals.fat,
          fiber: totals.fiber > 0 ? totals.fiber : null,
          quantity: 1,
          consumed_date: consumedDate,
          notes: notes.trim() || null,
        })

      if (insertError) throw insertError

      navigate('/')
    } catch (e: any) {
      setError(e.message || 'Failed to save and log meal')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || loading) return

    setLoading(true)
    setError(null)

    try {
      let nutritionData
      let mealName
      let mealId = null
      let quantityValue = 1

      if (entryMode === 'meal') {
        if (!selectedMeal) {
          throw new Error('Please select a meal')
        }

        // Calculate nutrition from adjusted meal foods
        const totals = calculateTotalNutrition()
        nutritionData = {
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          sugar: totals.sugar > 0 ? totals.sugar : null,
          fat: totals.fat,
          fiber: totals.fiber > 0 ? totals.fiber : null,
        }
        mealName = selectedMeal.name
        mealId = selectedMeal.id
        quantityValue = 1
      } else if (entryMode === 'create') {
        if (createMealFoods.length === 0) {
          throw new Error('Please add at least one food')
        }

        // Calculate nutrition from created meal foods
        const totals = calculateCreateMealNutrition()
        nutritionData = {
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          sugar: totals.sugar > 0 ? totals.sugar : null,
          fat: totals.fat,
          fiber: totals.fiber > 0 ? totals.fiber : null,
        }
        mealName = createMealName.trim() || 'Quick Meal'
        mealId = null
        quantityValue = 1
      } else {
        // Manual entry mode
        nutritionData = {
          calories: parseFloat(manualCalories),
          protein: parseFloat(manualProtein),
          carbs: parseFloat(manualCarbs),
          sugar: manualSugar.trim() ? parseFloat(manualSugar) : null,
          fat: parseFloat(manualFat),
          fiber: manualFiber.trim() ? parseFloat(manualFiber) : null,
        }
        mealName = manualName.trim() || 'Manual Entry'
        quantityValue = 1
      }

      // Insert consumption with nutrition snapshot
      const { error: insertError } = await supabase
        .from('user_consumption')
        .insert({
          user_id: user.id,
          meal_id: mealId,
          meal_name: mealName,
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs,
          sugar: nutritionData.sugar,
          fat: nutritionData.fat,
          fiber: nutritionData.fiber,
          quantity: quantityValue,
          consumed_date: consumedDate,
          notes: notes.trim() || null,
        })

      if (insertError) throw insertError

      navigate('/')
    } catch (e: any) {
      setError(e.message || 'Failed to log consumption')
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
            <h1 className="text-xl font-bold">Log Meal</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Entry Mode Toggle */}
              <div>
                <label className="label">
                  <span className="label-text">Entry Type</span>
                </label>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="entryMode"
                      className="radio radio-primary"
                      checked={entryMode === 'meal'}
                      onChange={() => setEntryMode('meal')}
                      disabled={loading}
                    />
                    <span>Select Meal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="entryMode"
                      className="radio radio-primary"
                      checked={entryMode === 'create'}
                      onChange={() => setEntryMode('create')}
                      disabled={loading}
                    />
                    <span>Create Meal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="entryMode"
                      className="radio radio-primary"
                      checked={entryMode === 'manual'}
                      onChange={() => setEntryMode('manual')}
                      disabled={loading}
                    />
                    <span>Manual Entry</span>
                  </label>
                </div>
              </div>

              {/* Meal Selection Mode */}
              {entryMode === 'meal' && (
                <>
                  {/* Select Meal Button */}
                  <div>
                    <label className="label">
                      <span className="label-text">Selected Meal</span>
                    </label>
                    {selectedMeal ? (
                      <div className="card bg-base-200 border border-base-300">
                        <div className="card-body p-4">
                          <div className="flex items-center gap-3">
                            {selectedMeal.image_url && (
                              <img
                                src={selectedMeal.image_url}
                                alt={selectedMeal.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold">{selectedMeal.name}</h3>
                              {selectedMeal.description && (
                                <p className="text-sm opacity-60">{selectedMeal.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setShowMealSelector(true)}
                              disabled={loading}
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline w-full"
                        onClick={() => setShowMealSelector(true)}
                        disabled={loading || meals.length === 0}
                      >
                        {meals.length === 0 ? 'No meals available' : 'Select a Meal'}
                      </button>
                    )}
                  </div>

                  {/* Display Meal Foods with Editable Quantities */}
                  {selectedMeal && mealFoods.length > 0 && (
                    <div>
                      <label className="label">
                        <span className="label-text">Foods in this meal (adjust servings if needed)</span>
                      </label>
                      <div className="space-y-3">
                        {mealFoods.map((mf, index) => {
                          const isOriginalFood = originalMealFoodIds.includes(mf.food_id)
                          return (
                            <div key={`${mf.food_id}-${index}`} className="card bg-base-200 border border-base-300">
                              <div className="card-body p-3">
                                <div className="flex items-center gap-3">
                                  {mf.food.image_url && (
                                    <img
                                      src={mf.food.image_url}
                                      alt={mf.food.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm">
                                      {mf.food.name}
                                      {!isOriginalFood && (
                                        <span className="ml-2 badge badge-primary badge-xs">Extra</span>
                                      )}
                                    </h4>
                                    {mf.food.brand_name && (
                                      <p className="text-xs opacity-60">{mf.food.brand_name}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      className="input input-bordered input-sm w-20"
                                      value={mf.quantity}
                                      onChange={(e) => updateMealFoodQuantity(index, e.target.value)}
                                      min="0"
                                      disabled={loading}
                                    />
                                    <select
                                      className="select select-bordered select-sm w-28"
                                      value={mf.unit}
                                      onChange={(e) => updateMealFoodUnit(index, e.target.value)}
                                      disabled={loading}
                                    >
                                      {getAvailableUnits(mf.food).map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                      ))}
                                    </select>
                                    {!isOriginalFood && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm btn-circle text-error"
                                        onClick={() => removeExtraFood(mf.food_id)}
                                        disabled={loading}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Add Extra Food Button */}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm w-full mt-3"
                        onClick={() => setShowFoodSelector(true)}
                        disabled={loading}
                      >
                        + Add Extra Food
                      </button>

                      {/* Total Nutrition Preview */}
                      <div className="mt-4 p-3 bg-base-200 rounded-lg">
                        <p className="text-sm font-medium mb-2">Total Nutrition:</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="opacity-60">Calories:</span> {Math.round(calculateTotalNutrition().calories)} kcal
                          </div>
                          <div>
                            <span className="opacity-60">Protein:</span> {Math.round(calculateTotalNutrition().protein)}g
                          </div>
                          <div>
                            <span className="opacity-60">Carbs:</span> {Math.round(calculateTotalNutrition().carbs)}g
                          </div>
                          <div>
                            <span className="opacity-60">Fat:</span> {Math.round(calculateTotalNutrition().fat)}g
                          </div>
                          <div>
                            <span className="opacity-60">Sugar:</span> {Math.round(calculateTotalNutrition().sugar)}g
                          </div>
                          <div>
                            <span className="opacity-60">Fiber:</span> {Math.round(calculateTotalNutrition().fiber)}g
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Create Meal Mode */}
              {entryMode === 'create' && (
                <>
                  {/* Meal Name */}
                  <div>
                    <label className="label">
                      <span className="label-text">Meal Name (optional for logging, required for saving)</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="e.g., My Breakfast"
                      value={createMealName}
                      onChange={(e) => setCreateMealName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Meal Description */}
                  <div>
                    <label className="label">
                      <span className="label-text">Description (optional)</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      placeholder="Add a description..."
                      value={createMealDescription}
                      onChange={(e) => setCreateMealDescription(e.target.value)}
                      rows={2}
                      disabled={loading}
                    />
                  </div>

                  {/* Foods in Create Meal */}
                  <div>
                    <label className="label">
                      <span className="label-text">Foods</span>
                    </label>
                    {createMealFoods.length === 0 ? (
                      <button
                        type="button"
                        className="btn btn-outline w-full"
                        onClick={() => setShowFoodSelector(true)}
                        disabled={loading}
                      >
                        + Add Food
                      </button>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {createMealFoods.map((mf, index) => (
                            <div key={`${mf.food_id}-${index}`} className="card bg-base-200 border border-base-300">
                              <div className="card-body p-3">
                                <div className="flex items-center gap-3">
                                  {mf.food.image_url && (
                                    <img
                                      src={mf.food.image_url}
                                      alt={mf.food.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm">{mf.food.name}</h4>
                                    {mf.food.brand_name && (
                                      <p className="text-xs opacity-60">{mf.food.brand_name}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      className="input input-bordered input-sm w-20"
                                      value={mf.quantity}
                                      onChange={(e) => updateCreateMealFoodQuantity(index, e.target.value)}
                                      min="0"
                                      disabled={loading}
                                    />
                                    <select
                                      className="select select-bordered select-sm w-28"
                                      value={mf.unit}
                                      onChange={(e) => updateCreateMealFoodUnit(index, e.target.value)}
                                      disabled={loading}
                                    >
                                      {getAvailableUnits(mf.food).map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-sm btn-circle text-error"
                                      onClick={() => removeCreateMealFood(index)}
                                      disabled={loading}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add More Food Button */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm w-full mt-3"
                          onClick={() => setShowFoodSelector(true)}
                          disabled={loading}
                        >
                          + Add Another Food
                        </button>

                        {/* Total Nutrition Preview */}
                        <div className="mt-4 p-3 bg-base-200 rounded-lg">
                          <p className="text-sm font-medium mb-2">Total Nutrition:</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="opacity-60">Calories:</span> {Math.round(calculateCreateMealNutrition().calories)} kcal
                            </div>
                            <div>
                              <span className="opacity-60">Protein:</span> {Math.round(calculateCreateMealNutrition().protein)}g
                            </div>
                            <div>
                              <span className="opacity-60">Carbs:</span> {Math.round(calculateCreateMealNutrition().carbs)}g
                            </div>
                            <div>
                              <span className="opacity-60">Fat:</span> {Math.round(calculateCreateMealNutrition().fat)}g
                            </div>
                            <div>
                              <span className="opacity-60">Sugar:</span> {Math.round(calculateCreateMealNutrition().sugar)}g
                            </div>
                            <div>
                              <span className="opacity-60">Fiber:</span> {Math.round(calculateCreateMealNutrition().fiber)}g
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Manual Entry Mode */}
              {entryMode === 'manual' && (
                <>
                  {/* Name/Description */}
                  <div>
                    <label className="label">
                      <span className="label-text">Name/Description</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="e.g., Quick snack"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Calories */}
                  <div>
                    <label className="label">
                      <span className="label-text">Calories (kcal)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      placeholder="e.g., 250"
                      value={manualCalories}
                      onChange={(e) => setManualCalories(e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
                  </div>

                  {/* Protein */}
                  <div>
                    <label className="label">
                      <span className="label-text">Protein (g)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      placeholder="e.g., 15"
                      value={manualProtein}
                      onChange={(e) => setManualProtein(e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
                  </div>

                  {/* Carbs */}
                  <div>
                    <label className="label">
                      <span className="label-text">Carbohydrates (g)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      placeholder="e.g., 30"
                      value={manualCarbs}
                      onChange={(e) => setManualCarbs(e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
                  </div>

                  {/* Fat */}
                  <div>
                    <label className="label">
                      <span className="label-text">Fat (g)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      placeholder="e.g., 10"
                      value={manualFat}
                      onChange={(e) => setManualFat(e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
                  </div>

                  {/* Sugar (Optional) */}
                  <div>
                    <label className="label">
                      <span className="label-text">Sugar (g) - Optional</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      placeholder="e.g., 5"
                      value={manualSugar}
                      onChange={(e) => setManualSugar(e.target.value)}
                      min="0"
                      disabled={loading}
                    />
                  </div>

                  {/* Fiber (Optional) */}
                  <div>
                    <label className="label">
                      <span className="label-text">Fiber (g) - Optional</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      placeholder="e.g., 3"
                      value={manualFiber}
                      onChange={(e) => setManualFiber(e.target.value)}
                      min="0"
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {/* Consumed Date */}
              <div>
                <label className="label">
                  <span className="label-text">Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={consumedDate}
                  onChange={(e) => setConsumedDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="label">
                  <span className="label-text">Notes (Optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Add any notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={loading}
                />
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
                {entryMode === 'create' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSaveAndLog}
                    disabled={loading || createMealFoods.length === 0}
                  >
                    {loading ? 'Saving...' : 'Save & Log'}
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || (entryMode === 'meal' && !selectedMeal) || (entryMode === 'create' && createMealFoods.length === 0)}
                >
                  {loading ? 'Logging...' : entryMode === 'create' ? 'Log Only' : entryMode === 'meal' ? 'Log Meal' : 'Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Meal Selector Modal */}
      {showMealSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-base-300 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Select a Meal</h3>
              <button
                onClick={() => {
                  setShowMealSelector(false)
                  setMealSearchQuery('')
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-base-300">
              <input
                type="text"
                placeholder="Search meals..."
                className="input input-bordered w-full"
                value={mealSearchQuery}
                onChange={(e) => setMealSearchQuery(e.target.value)}
              />
            </div>

            {/* Meals Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredMeals.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                  <p>No meals found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMeals.map((meal) => (
                    <div
                      key={meal.id}
                      onClick={() => selectMeal(meal.id)}
                      className="card bg-base-200 hover:bg-base-300 cursor-pointer transition border border-base-300 hover:border-primary"
                    >
                      <div className="card-body p-4">
                        {meal.image_url && (
                          <img
                            src={meal.image_url}
                            alt={meal.name}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        )}
                        <h4 className="font-semibold text-sm">{meal.name}</h4>
                        {meal.description && (
                          <p className="text-xs opacity-60 line-clamp-2">{meal.description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                          <div>
                            <span className="opacity-60">Cal:</span> {Math.round(meal.calories)}
                          </div>
                          <div>
                            <span className="opacity-60">Pro:</span> {Math.round(meal.protein)}g
                          </div>
                          <div>
                            <span className="opacity-60">Carbs:</span> {Math.round(meal.carbs)}g
                          </div>
                          <div>
                            <span className="opacity-60">Fat:</span> {Math.round(meal.fat)}g
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
      )}

      {/* Food Selector Modal (for adding extra foods) */}
      {showFoodSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-base-300 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add Extra Food</h3>
              <button
                onClick={() => {
                  setShowFoodSelector(false)
                  setFoodSearchQuery('')
                  setFoodCategoryFilter('all')
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b border-base-300 space-y-3">
              <input
                type="text"
                placeholder="Search foods..."
                className="input input-bordered w-full"
                value={foodSearchQuery}
                onChange={(e) => setFoodSearchQuery(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                {foodCategories.map(category => (
                  <button
                    key={category}
                    className={`btn btn-sm ${foodCategoryFilter === category ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setFoodCategoryFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Foods Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredFoods.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                  <p>No foods found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFoods.map((food) => (
                    <div
                      key={food.id}
                      onClick={() => addExtraFood(food.id)}
                      className="card bg-base-200 hover:bg-base-300 cursor-pointer transition border border-base-300 hover:border-primary"
                    >
                      <div className="card-body p-4">
                        {food.image_url && (
                          <img
                            src={food.image_url}
                            alt={food.name}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        )}
                        <h4 className="font-semibold text-sm">{food.name}</h4>
                        {food.brand_name && (
                          <p className="text-xs opacity-60">{food.brand_name}</p>
                        )}
                        <div className="text-xs opacity-60 mt-1">
                          {food.reference_serving_amount} {food.reference_serving_unit}
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                          <div>
                            <span className="opacity-60">Cal:</span> {Math.round(food.calories)}
                          </div>
                          <div>
                            <span className="opacity-60">Pro:</span> {Math.round(food.protein)}g
                          </div>
                          <div>
                            <span className="opacity-60">Carbs:</span> {Math.round(food.carbs)}g
                          </div>
                          <div>
                            <span className="opacity-60">Fat:</span> {Math.round(food.fat)}g
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
      )}
    </div>
  )
}
