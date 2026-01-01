import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../libs/supabase'
import SetGoalsModal from '../components/SetGoalsModal'

interface UserGoals {
  daily_calorie_goal: number
  daily_protein_goal: number
  daily_carbs_goal: number
  daily_fat_goal: number
}

interface DailyTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
  mealsLogged: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [goals, setGoals] = useState<UserGoals>({
    daily_calorie_goal: 2000,
    daily_protein_goal: 150,
    daily_carbs_goal: 250,
    daily_fat_goal: 65,
  })
  const [totals, setTotals] = useState<DailyTotals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealsLogged: 0,
  })

  useEffect(() => {
    if (user) {
      fetchGoals()
      fetchTodaysTotals()
    }
  }, [user])

  async function fetchGoals() {
    try {
      const { data } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (data) {
        setGoals({
          daily_calorie_goal: data.daily_calorie_goal,
          daily_protein_goal: data.daily_protein_goal,
          daily_carbs_goal: data.daily_carbs_goal,
          daily_fat_goal: data.daily_fat_goal,
        })
      }
    } catch (e) {
      // Use default goals if none set
    }
  }

  async function fetchTodaysTotals() {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0]

      // Fetch today's consumption - nutrition is saved directly, no joins needed!
      const { data: consumptionData, error } = await supabase
        .from('user_consumption')
        .select('calories, protein, carbs, fat')
        .eq('user_id', user?.id)
        .eq('consumed_date', today)

      if (error) throw error

      // Simply sum the saved nutrition values
      let totalCalories = 0
      let totalProtein = 0
      let totalCarbs = 0
      let totalFat = 0

      consumptionData?.forEach((entry: any) => {
        totalCalories += entry.calories || 0
        totalProtein += entry.protein || 0
        totalCarbs += entry.carbs || 0
        totalFat += entry.fat || 0
      })

      setTotals({
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat),
        mealsLogged: consumptionData?.length || 0,
      })
    } catch (e) {
      console.error('Error fetching totals:', e)
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
                <button onClick={() => navigate('/')} className="text-sm font-medium text-primary">
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
                    <button onClick={() => navigate('/')} className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-base-200 rounded">
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
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Today's Overview</h2>
          <p className="opacity-60 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Calories */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium opacity-60">Calories</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-3xl font-bold">{totals.calories}</p>
                    <p className="text-sm opacity-60">/ {goals.daily_calorie_goal} kcal</p>
                  </div>
                </div>
                <div className="badge badge-primary badge-sm">Today</div>
              </div>
              <progress className="progress progress-primary" value={Math.min((totals.calories / goals.daily_calorie_goal) * 100, 100)} max="100"></progress>
              <p className="text-xs opacity-60 mt-2">{Math.round((totals.calories / goals.daily_calorie_goal) * 100)}% of daily goal</p>
            </div>
          </div>

          {/* Protein */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="mb-4">
                <p className="text-sm font-medium opacity-60">Protein</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-bold">{totals.protein}</p>
                  <p className="text-sm opacity-60">/ {goals.daily_protein_goal}g</p>
                </div>
              </div>
              <progress className="progress progress-success" value={Math.min((totals.protein / goals.daily_protein_goal) * 100, 100)} max="100"></progress>
              <p className="text-xs opacity-60 mt-2">{Math.round((totals.protein / goals.daily_protein_goal) * 100)}% of daily goal</p>
            </div>
          </div>

          {/* Meals Logged */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="mb-4">
                <p className="text-sm font-medium opacity-60">Meals Logged</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-bold">{totals.mealsLogged}</p>
                  <p className="text-sm opacity-60">meals</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="badge badge-outline badge-sm">Breakfast</div>
                <div className="badge badge-outline badge-sm">Lunch</div>
                <div className="badge badge-outline badge-sm">Dinner</div>
              </div>
            </div>
          </div>
        </div>

        {/* Macronutrients */}
        <div className="card bg-base-100 shadow-sm mb-8">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-6">Macronutrients</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm opacity-60">{totals.protein} / {goals.daily_protein_goal}g</span>
                </div>
                <progress className="progress progress-success w-full" value={Math.min((totals.protein / goals.daily_protein_goal) * 100, 100)} max="100"></progress>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Carbs</span>
                  <span className="text-sm opacity-60">{totals.carbs} / {goals.daily_carbs_goal}g</span>
                </div>
                <progress className="progress progress-warning w-full" value={Math.min((totals.carbs / goals.daily_carbs_goal) * 100, 100)} max="100"></progress>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Fats</span>
                  <span className="text-sm opacity-60">{totals.fat} / {goals.daily_fat_goal}g</span>
                </div>
                <progress className="progress progress-info w-full" value={Math.min((totals.fat / goals.daily_fat_goal) * 100, 100)} max="100"></progress>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card bg-base-100 shadow-sm mb-8">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/log-meal')}
              >
                + Log Meal
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/add-meal')}
              >
                + Add Meal
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/add-food')}
              >
                + Add Food
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/add-ingredient')}
              >
                + Add Ingredient
              </button>
              <button className="btn btn-outline">
                View Stats
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setIsGoalsModalOpen(true)}
              >
                Set Goals
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <button className="link link-primary text-sm">View All</button>
            </div>
            <div className="text-center py-16 opacity-60">
              <p className="font-medium">No meals logged yet</p>
              <p className="text-sm mt-1">
                Start tracking by logging your first meal
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Set Goals Modal */}
      <SetGoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        onSaved={fetchGoals}
      />
    </div>
  )
}
