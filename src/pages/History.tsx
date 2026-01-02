import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface DailySnapshot {
  id: string
  log_date: string
  calories_goal: number
  protein_goal: number
  carbs_goal: number
  fat_goal: number
  sugar_goal: number | null
  fiber_goal: number | null
  calories_consumed: number
  protein_consumed: number
  carbs_consumed: number
  fat_consumed: number
  sugar_consumed: number
  fiber_consumed: number
}

interface UserGoals {
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
}

export default function History() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<DailySnapshot>>({})

  useEffect(() => {
    if (user) {
      initializeHistory()
    }
  }, [user])

  async function initializeHistory() {
    try {
      setLoading(true)

      // First, clean up old data (older than 90 days)
      await supabase.rpc('delete_old_nutrition_snapshots')

      // Create/update snapshots for all days with consumption data
      await createMissingSnapshots()

      // Fetch all snapshots for the past 90 days
      await fetchSnapshots()
    } catch (e) {
      console.error('Error initializing history:', e)
    } finally {
      setLoading(false)
    }
  }

  async function createMissingSnapshots() {
    try {
      // Get current goals
      const { data: goalsData } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      const currentGoals: UserGoals = goalsData || {
        calories: 2000,
        protein: 150,
        carbs: 250,
        sugar: null,
        fat: 65,
        fiber: null,
      }

      // Get all unique dates from user_consumption in the past 90 days
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

      const { data: consumptionDates } = await supabase
        .from('user_consumption')
        .select('consumed_date')
        .eq('user_id', user?.id)
        .gte('consumed_date', ninetyDaysAgoStr)

      if (!consumptionDates || consumptionDates.length === 0) return

      // Get unique dates
      const uniqueDates = [...new Set(consumptionDates.map(c => c.consumed_date))]

      // For each date, create or update snapshot
      for (const date of uniqueDates) {
        // Calculate totals for this date
        const { data: dayConsumption } = await supabase
          .from('user_consumption')
          .select('calories, protein, carbs, fat, sugar, fiber')
          .eq('user_id', user?.id)
          .eq('consumed_date', date)

        if (!dayConsumption) continue

        const totals = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sugar: 0,
          fiber: 0,
        }

        dayConsumption.forEach((entry: any) => {
          totals.calories += entry.calories || 0
          totals.protein += entry.protein || 0
          totals.carbs += entry.carbs || 0
          totals.fat += entry.fat || 0
          totals.sugar += entry.sugar || 0
          totals.fiber += entry.fiber || 0
        })

        // Upsert snapshot
        await supabase
          .from('daily_nutrition_snapshots')
          .upsert({
            user_id: user?.id,
            log_date: date,
            calories_goal: currentGoals.calories,
            protein_goal: currentGoals.protein,
            carbs_goal: currentGoals.carbs,
            fat_goal: currentGoals.fat,
            sugar_goal: currentGoals.sugar,
            fiber_goal: currentGoals.fiber,
            calories_consumed: totals.calories,
            protein_consumed: totals.protein,
            carbs_consumed: totals.carbs,
            fat_consumed: totals.fat,
            sugar_consumed: totals.sugar,
            fiber_consumed: totals.fiber,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,log_date',
          })
      }
    } catch (e) {
      console.error('Error creating snapshots:', e)
    }
  }

  async function fetchSnapshots() {
    try {
      const { data, error } = await supabase
        .from('daily_nutrition_snapshots')
        .select('*')
        .eq('user_id', user?.id)
        .order('log_date', { ascending: false })

      if (error) throw error
      setSnapshots(data || [])
    } catch (e) {
      console.error('Error fetching snapshots:', e)
    }
  }

  function canEdit(logDate: string): boolean {
    const date = new Date(logDate)
    const today = new Date()
    const diffTime = today.getTime() - date.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  }

  function startEditing(snapshot: DailySnapshot) {
    setEditingId(snapshot.id)
    setEditValues({
      calories_consumed: snapshot.calories_consumed,
      protein_consumed: snapshot.protein_consumed,
      carbs_consumed: snapshot.carbs_consumed,
      fat_consumed: snapshot.fat_consumed,
      sugar_consumed: snapshot.sugar_consumed,
      fiber_consumed: snapshot.fiber_consumed,
    })
  }

  function cancelEditing() {
    setEditingId(null)
    setEditValues({})
  }

  async function saveEditing(id: string) {
    try {
      const { error } = await supabase
        .from('daily_nutrition_snapshots')
        .update({
          calories_consumed: editValues.calories_consumed,
          protein_consumed: editValues.protein_consumed,
          carbs_consumed: editValues.carbs_consumed,
          fat_consumed: editValues.fat_consumed,
          sugar_consumed: editValues.sugar_consumed,
          fiber_consumed: editValues.fiber_consumed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // Refresh snapshots
      await fetchSnapshots()
      setEditingId(null)
      setEditValues({})
    } catch (e: any) {
      console.error('Error saving:', e)
      alert('Failed to save changes')
    }
  }

  return (
    <div className="min-h-dvh bg-base-200">
      {/* Header */}
      <header className="bg-base-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">Calorie Tracker</h1>

            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6">
                <button onClick={() => navigate('/')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
                  Dashboard
                </button>
                <button onClick={() => navigate('/ingredients')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
                  Ingredients
                </button>
                <button onClick={() => navigate('/foods')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
                  Foods
                </button>
                <button onClick={() => navigate('/meals')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
                  Meals
                </button>
                <button onClick={() => navigate('/history')} className="text-sm font-medium text-primary">
                  History
                </button>
              </nav>

              {/* Mobile Menu */}
              <div className="dropdown dropdown-end md:hidden">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-square">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </div>
                <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg dropdown-content bg-base-100 rounded-lg w-52 border border-base-300">
                  <li>
                    <button onClick={() => navigate('/')} className="block w-full text-left px-4 py-2 text-sm hover:bg-base-200 rounded">
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/ingredients')} className="block w-full text-left px-4 py-2 text-sm hover:bg-base-200 rounded">
                      Ingredients
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/foods')} className="block w-full text-left px-4 py-2 text-sm hover:bg-base-200 rounded">
                      Foods
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/meals')} className="block w-full text-left px-4 py-2 text-sm hover:bg-base-200 rounded">
                      Meals
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/history')} className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-base-200 rounded">
                      History
                    </button>
                  </li>
                </ul>
              </div>

              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost btn-circle avatar placeholder"
                >
                  <div className="bg-primary text-primary-content rounded-full w-10">
                    <span>{user?.email?.[0].toUpperCase()}</span>
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  className="mt-3 z-[1] p-2 shadow-lg dropdown-content bg-base-100 rounded-lg w-52 border border-base-300"
                >
                  <li className="px-4 py-2 border-b border-base-300">
                    <p className="text-xs opacity-60">Signed in as</p>
                    <p className="text-sm font-medium truncate">
                      {user?.email}
                    </p>
                  </li>
                  <li>
                    <a className="block px-4 py-2 text-sm hover:bg-base-200 rounded cursor-pointer">
                      Settings
                    </a>
                  </li>
                  <li>
                    <a
                      onClick={signOut}
                      className="block px-4 py-2 text-sm text-error hover:bg-error hover:bg-opacity-10 rounded cursor-pointer"
                    >
                      Sign Out
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Nutrition History</h2>
            <p className="opacity-60 mt-1">Past 90 days of nutrition tracking</p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/')}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* History List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center py-12">
              <p className="text-lg opacity-60">No history data yet.</p>
              <p className="text-sm opacity-60 mt-2">Start logging meals to build your nutrition history.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {snapshots.map((snapshot) => {
              const isEditing = editingId === snapshot.id
              const isEditable = canEdit(snapshot.log_date)

              return (
                <div key={snapshot.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {new Date(snapshot.log_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </h3>
                        <p className="text-sm opacity-60">{snapshot.log_date}</p>
                      </div>
                      {isEditable && !isEditing && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => startEditing(snapshot)}
                        >
                          Edit
                        </button>
                      )}
                      {isEditing && (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => saveEditing(snapshot.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {/* Calories */}
                      <div>
                        <p className="text-xs opacity-60 mb-1">Calories</p>
                        {isEditing ? (
                          <input
                            type="number"
                            className="input input-sm input-bordered w-full"
                            value={editValues.calories_consumed || 0}
                            onChange={(e) => setEditValues({ ...editValues, calories_consumed: parseFloat(e.target.value) || 0 })}
                          />
                        ) : (
                          <p className="font-semibold">{Math.round(snapshot.calories_consumed)}</p>
                        )}
                        <p className="text-xs opacity-60">/ {Math.round(snapshot.calories_goal)} kcal</p>
                        <progress
                          className="progress progress-primary w-full mt-1"
                          value={Math.min((snapshot.calories_consumed / snapshot.calories_goal) * 100, 100)}
                          max="100"
                        ></progress>
                      </div>

                      {/* Protein */}
                      <div>
                        <p className="text-xs opacity-60 mb-1">Protein</p>
                        {isEditing ? (
                          <input
                            type="number"
                            className="input input-sm input-bordered w-full"
                            value={editValues.protein_consumed || 0}
                            onChange={(e) => setEditValues({ ...editValues, protein_consumed: parseFloat(e.target.value) || 0 })}
                          />
                        ) : (
                          <p className="font-semibold">{Math.round(snapshot.protein_consumed)}g</p>
                        )}
                        <p className="text-xs opacity-60">/ {Math.round(snapshot.protein_goal)}g</p>
                        <progress
                          className="progress progress-success w-full mt-1"
                          value={Math.min((snapshot.protein_consumed / snapshot.protein_goal) * 100, 100)}
                          max="100"
                        ></progress>
                      </div>

                      {/* Carbs */}
                      <div>
                        <p className="text-xs opacity-60 mb-1">Carbs</p>
                        {isEditing ? (
                          <input
                            type="number"
                            className="input input-sm input-bordered w-full"
                            value={editValues.carbs_consumed || 0}
                            onChange={(e) => setEditValues({ ...editValues, carbs_consumed: parseFloat(e.target.value) || 0 })}
                          />
                        ) : (
                          <p className="font-semibold">{Math.round(snapshot.carbs_consumed)}g</p>
                        )}
                        <p className="text-xs opacity-60">/ {Math.round(snapshot.carbs_goal)}g</p>
                        <progress
                          className="progress progress-warning w-full mt-1"
                          value={Math.min((snapshot.carbs_consumed / snapshot.carbs_goal) * 100, 100)}
                          max="100"
                        ></progress>
                      </div>

                      {/* Fat */}
                      <div>
                        <p className="text-xs opacity-60 mb-1">Fat</p>
                        {isEditing ? (
                          <input
                            type="number"
                            className="input input-sm input-bordered w-full"
                            value={editValues.fat_consumed || 0}
                            onChange={(e) => setEditValues({ ...editValues, fat_consumed: parseFloat(e.target.value) || 0 })}
                          />
                        ) : (
                          <p className="font-semibold">{Math.round(snapshot.fat_consumed)}g</p>
                        )}
                        <p className="text-xs opacity-60">/ {Math.round(snapshot.fat_goal)}g</p>
                        <progress
                          className="progress progress-info w-full mt-1"
                          value={Math.min((snapshot.fat_consumed / snapshot.fat_goal) * 100, 100)}
                          max="100"
                        ></progress>
                      </div>

                      {/* Sugar */}
                      {snapshot.sugar_goal !== null && (
                        <div>
                          <p className="text-xs opacity-60 mb-1">Sugar</p>
                          {isEditing ? (
                            <input
                              type="number"
                              className="input input-sm input-bordered w-full"
                              value={editValues.sugar_consumed || 0}
                              onChange={(e) => setEditValues({ ...editValues, sugar_consumed: parseFloat(e.target.value) || 0 })}
                            />
                          ) : (
                            <p className="font-semibold">{Math.round(snapshot.sugar_consumed)}g</p>
                          )}
                          <p className="text-xs opacity-60">/ {Math.round(snapshot.sugar_goal)}g</p>
                          <progress
                            className="progress progress-error w-full mt-1"
                            value={Math.min((snapshot.sugar_consumed / snapshot.sugar_goal) * 100, 100)}
                            max="100"
                          ></progress>
                        </div>
                      )}

                      {/* Fiber */}
                      {snapshot.fiber_goal !== null && (
                        <div>
                          <p className="text-xs opacity-60 mb-1">Fiber</p>
                          {isEditing ? (
                            <input
                              type="number"
                              className="input input-sm input-bordered w-full"
                              value={editValues.fiber_consumed || 0}
                              onChange={(e) => setEditValues({ ...editValues, fiber_consumed: parseFloat(e.target.value) || 0 })}
                            />
                          ) : (
                            <p className="font-semibold">{Math.round(snapshot.fiber_consumed)}g</p>
                          )}
                          <p className="text-xs opacity-60">/ {Math.round(snapshot.fiber_goal)}g</p>
                          <progress
                            className="progress progress-accent w-full mt-1"
                            value={Math.min((snapshot.fiber_consumed / snapshot.fiber_goal) * 100, 100)}
                            max="100"
                          ></progress>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
