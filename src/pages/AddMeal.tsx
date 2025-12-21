import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Food {
  id: string
  name: string
  brand_name: string | null
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
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'>('breakfast')
  const [description, setDescription] = useState('')
  const [mealFoods, setMealFoods] = useState<MealFood[]>([])

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
  const servingUnits = ['g', 'ml', 'cup', 'piece', 'tbsp', 'tsp', 'oz', 'lb']

  useEffect(() => {
    fetchFoods()
  }, [])

  async function fetchFoods() {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, brand_name')
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
      // Insert meal
      const { data: mealData, error: insertError } = await supabase
        .from('meals')
        .insert({
          name: name.trim(),
          meal_type: mealType,
          description: description.trim() || null,
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

              {/* Meal Type */}
              <div>
                <label className="label">
                  <span className="label-text">Meal Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as typeof mealType)}
                  disabled={loading}
                >
                  {mealTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
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
