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

  // Form fields
  const [selectedMealId, setSelectedMealId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [consumedDate, setConsumedDate] = useState('')
  const [notes, setNotes] = useState('')

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
      // Find the selected meal to get nutrition data
      const meal = meals.find(m => m.id === selectedMealId)
      if (!meal) {
        throw new Error('Selected meal not found')
      }

      // Calculate nutrition snapshot based on quantity
      const multiplier = parseFloat(quantity)
      const nutritionSnapshot = {
        calories: meal.calories * multiplier,
        protein: meal.protein * multiplier,
        carbs: meal.carbs * multiplier,
        sugar: meal.sugar ? meal.sugar * multiplier : null,
        fat: meal.fat * multiplier,
        fiber: meal.fiber ? meal.fiber * multiplier : null,
      }

      // Insert consumption with nutrition snapshot
      const { error: insertError } = await supabase
        .from('user_consumption')
        .insert({
          user_id: user.id,
          meal_id: selectedMealId,
          meal_name: meal.name,
          calories: nutritionSnapshot.calories,
          protein: nutritionSnapshot.protein,
          carbs: nutritionSnapshot.carbs,
          sugar: nutritionSnapshot.sugar,
          fat: nutritionSnapshot.fat,
          fiber: nutritionSnapshot.fiber,
          quantity: multiplier,
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
                  disabled={loading || meals.length === 0}
                >
                  {loading ? 'Logging...' : 'Log Meal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
