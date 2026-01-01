import { useState, useEffect } from 'react'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface SetGoalsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export default function SetGoalsModal({ isOpen, onClose, onSaved }: SetGoalsModalProps) {
  const { user } = useAuth()
  const [calorieGoal, setCalorieGoal] = useState('2000')
  const [proteinGoal, setProteinGoal] = useState('150')
  const [carbsGoal, setCarbsGoal] = useState('250')
  const [sugarGoal, setSugarGoal] = useState('')
  const [fatGoal, setFatGoal] = useState('65')
  const [fiberGoal, setFiberGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && user) {
      fetchCurrentGoals()
    }
  }, [isOpen, user])

  async function fetchCurrentGoals() {
    try {
      const { data } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (data) {
        setCalorieGoal(data.calories.toString())
        setProteinGoal(data.protein.toString())
        setCarbsGoal(data.carbs.toString())
        setSugarGoal(data.sugar?.toString() || '')
        setFatGoal(data.fat.toString())
        setFiberGoal(data.fiber?.toString() || '')
      }
    } catch (e) {
      // No existing goals, use defaults
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || loading) return

    setLoading(true)
    setError(null)

    try {
      // Upsert goals (insert or update if exists)
      const { error: upsertError } = await supabase
        .from('user_goals')
        .upsert({
          user_id: user.id,
          calories: parseFloat(calorieGoal),
          protein: parseFloat(proteinGoal),
          carbs: parseFloat(carbsGoal),
          sugar: sugarGoal ? parseFloat(sugarGoal) : null,
          fat: parseFloat(fatGoal),
          fiber: fiberGoal ? parseFloat(fiberGoal) : null,
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) throw upsertError

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to save goals')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Set Your Daily Goals</h3>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="label">
              <span className="label-text">Daily Calorie Goal (kcal)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
              required
              min="0"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Daily Protein Goal (g)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={proteinGoal}
              onChange={(e) => setProteinGoal(e.target.value)}
              required
              min="0"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Daily Carbs Goal (g)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={carbsGoal}
              onChange={(e) => setCarbsGoal(e.target.value)}
              required
              min="0"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Daily Fat Goal (g)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={fatGoal}
              onChange={(e) => setFatGoal(e.target.value)}
              required
              min="0"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Daily Sugar Goal (g) - Optional</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={sugarGoal}
              onChange={(e) => setSugarGoal(e.target.value)}
              min="0"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Daily Fiber Goal (g) - Optional</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={fiberGoal}
              onChange={(e) => setFiberGoal(e.target.value)}
              min="0"
              disabled={loading}
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Goals'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}
