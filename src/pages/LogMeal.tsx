import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Meal {
  id: string
  name: string
  meal_type: string
}

interface Food {
  id: string
  name: string
  brand_name: string | null
}

export default function LogMeal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [logType, setLogType] = useState<'meal' | 'food'>('meal')
  const [selectedMealId, setSelectedMealId] = useState('')
  const [selectedFoodId, setSelectedFoodId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('serving')
  const [consumedAt, setConsumedAt] = useState('')
  const [notes, setNotes] = useState('')

  const servingUnits = ['serving', 'g', 'ml', 'cup', 'piece', 'tbsp', 'tsp', 'oz', 'lb']

  useEffect(() => {
    // Set default consumed_at to current time
    const now = new Date()
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setConsumedAt(localDateTime)

    fetchMeals()
    fetchFoods()
  }, [])

  async function fetchMeals() {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('id, name, meal_type')
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

  async function fetchFoods() {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, brand_name')
        .order('name')

      if (error) throw error
      setFoods(data || [])
      if (data && data.length > 0) {
        setSelectedFoodId(data[0].id)
      }
    } catch (e: any) {
      console.error('Error fetching foods:', e)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || loading) return

    setLoading(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('user_consumption')
        .insert({
          user_id: user.id,
          meal_id: logType === 'meal' ? selectedMealId : null,
          food_id: logType === 'food' ? selectedFoodId : null,
          quantity: parseFloat(quantity),
          unit: unit,
          consumed_at: new Date(consumedAt).toISOString(),
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
              {/* Log Type */}
              <div>
                <label className="label">
                  <span className="label-text">What are you logging?</span>
                </label>
                <div className="flex gap-4">
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      className="radio"
                      checked={logType === 'meal'}
                      onChange={() => setLogType('meal')}
                      disabled={loading}
                    />
                    <span className="label-text">Meal</span>
                  </label>
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      className="radio"
                      checked={logType === 'food'}
                      onChange={() => setLogType('food')}
                      disabled={loading}
                    />
                    <span className="label-text">Individual Food</span>
                  </label>
                </div>
              </div>

              {/* Select Meal */}
              {logType === 'meal' && (
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
                        {meal.name} ({meal.meal_type})
                      </option>
                    ))}
                  </select>
                  {meals.length === 0 && (
                    <p className="text-sm text-warning mt-2">
                      No meals available. Create meals first.
                    </p>
                  )}
                </div>
              )}

              {/* Select Food */}
              {logType === 'food' && (
                <div>
                  <label className="label">
                    <span className="label-text">Select Food</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={selectedFoodId}
                    onChange={(e) => setSelectedFoodId(e.target.value)}
                    required
                    disabled={loading || foods.length === 0}
                  >
                    {foods.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name} {food.brand_name ? `(${food.brand_name})` : ''}
                      </option>
                    ))}
                  </select>
                  {foods.length === 0 && (
                    <p className="text-sm text-warning mt-2">
                      No foods available. Create foods first.
                    </p>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="label">
                  <span className="label-text">Quantity</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered flex-1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    min="0"
                    disabled={loading}
                  />
                  <select
                    className="select select-bordered w-32"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    disabled={loading}
                  >
                    {servingUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consumed At */}
              <div>
                <label className="label">
                  <span className="label-text">When did you eat this?</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full"
                  value={consumedAt}
                  onChange={(e) => setConsumedAt(e.target.value)}
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
                  disabled={loading || (logType === 'meal' && meals.length === 0) || (logType === 'food' && foods.length === 0)}
                >
                  {loading ? 'Logging...' : 'Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
