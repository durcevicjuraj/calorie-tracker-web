import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Meal {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
}

export default function LogMeal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Entry mode: 'meal' or 'manual'
  const [entryMode, setEntryMode] = useState<'meal' | 'manual'>('meal')

  // Form fields for meal selection
  const [selectedMealId, setSelectedMealId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [consumedDate, setConsumedDate] = useState('')
  const [notes, setNotes] = useState('')

  // Form fields for manual entry
  const [manualName, setManualName] = useState('')
  const [manualCalories, setManualCalories] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFat, setManualFat] = useState('')
  const [manualSugar, setManualSugar] = useState('')
  const [manualFiber, setManualFiber] = useState('')

  useEffect(() => {
    // Set default consumed_date to today
    const today = new Date().toISOString().split('T')[0]
    setConsumedDate(today)

    fetchMeals()
  }, [])

  async function fetchMeals() {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('id, name, calories, protein, carbs, sugar, fat, fiber')
        .order('name')

      if (error) throw error
      setMeals(data || [])
      if (data && data.length > 0) {
        setSelectedMealId(data[0].id)
      }
    } catch (e: any) {
      console.error('Error fetching meals:', e)
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
        // Find the selected meal to get nutrition data
        const meal = meals.find(m => m.id === selectedMealId)
        if (!meal) {
          throw new Error('Selected meal not found')
        }

        // Calculate nutrition snapshot based on quantity
        const multiplier = parseFloat(quantity)
        nutritionData = {
          calories: meal.calories * multiplier,
          protein: meal.protein * multiplier,
          carbs: meal.carbs * multiplier,
          sugar: meal.sugar ? meal.sugar * multiplier : null,
          fat: meal.fat * multiplier,
          fiber: meal.fiber ? meal.fiber * multiplier : null,
        }
        mealName = meal.name
        mealId = selectedMealId
        quantityValue = multiplier
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
                <div className="flex gap-4">
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
                  {/* Select Meal */}
                  <div>
                    <label className="label">
                      <span className="label-text">Select Meal</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedMealId}
                      onChange={(e) => setSelectedMealId(e.target.value)}
                      required
                      disabled={loading || meals.length === 0}
                    >
                      {meals.map((meal) => (
                        <option key={meal.id} value={meal.id}>
                          {meal.name}
                        </option>
                      ))}
                    </select>
                    {meals.length === 0 && (
                      <p className="text-sm text-warning mt-2">
                        No meals available. Create meals first.
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="label">
                      <span className="label-text">Quantity (servings)</span>
                      <span className="label-text-alt opacity-60">How many servings did you eat?</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || (entryMode === 'meal' && meals.length === 0)}
                >
                  {loading ? 'Logging...' : entryMode === 'meal' ? 'Log Meal' : 'Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
