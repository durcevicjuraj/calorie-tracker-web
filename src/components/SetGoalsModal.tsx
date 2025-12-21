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
  const [fatGoal, setFatGoal] = useState('65')
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
        .eq('is_active', true)
        .single()

      if (data) {
        setCalorieGoal(data.daily_calorie_goal.toString())
        setProteinGoal(data.daily_protein_goal.toString())
        setCarbsGoal(data.daily_carbs_goal.toString())
        setFatGoal(data.daily_fat_goal.toString())
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
      // First, deactivate all existing goals
      await supabase
        .from('user_goals')
        .update({ is_active: false })
        .eq('user_id', user.id)

      // Then create a new active goal
      const { error: insertError } = await supabase
        .from('user_goals')
        .insert({
          user_id: user.id,
          daily_calorie_goal: parseFloat(calorieGoal),
          daily_protein_goal: parseFloat(proteinGoal),
          daily_carbs_goal: parseFloat(carbsGoal),
          daily_fat_goal: parseFloat(fatGoal),
          is_active: true,
        })

      if (insertError) throw insertError

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
