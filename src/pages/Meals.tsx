import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Meal {
  id: string
  name: string
  meal_type: string
  description: string | null
  created_at: string
}

export default function Meals() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMeals()
  }, [])

  async function fetchMeals() {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('name')

      if (error) throw error
      setMeals(data || [])
    } catch (e) {
      console.error('Error fetching meals:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredMeals = meals.filter(meal =>
    meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meal.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case 'breakfast': return 'badge-warning'
      case 'lunch': return 'badge-success'
      case 'dinner': return 'badge-info'
      case 'snack': return 'badge-secondary'
      default: return 'badge-neutral'
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
                <button onClick={() => navigate('/meals')} className="text-sm font-medium text-primary">
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
                    <button onClick={() => navigate('/meals')} className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-base-200 rounded">
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
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Meals</h2>
            <p className="opacity-60 mt-1">Browse and manage your meals</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/add-meal')}
          >
            + Add Meal
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search meals..."
            className="input input-bordered w-full max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Meals List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center py-12">
              <p className="text-lg opacity-60">
                {searchQuery ? 'No meals found matching your search.' : 'No meals yet.'}
              </p>
              {!searchQuery && (
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => navigate('/add-meal')}
                >
                  Add Your First Meal
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeals.map((meal) => (
              <div key={meal.id} className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title text-lg">
                    {meal.name}
                  </h3>
                  <div className={`badge ${getMealTypeColor(meal.meal_type)} badge-sm`}>
                    {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                  </div>

                  {meal.description && (
                    <p className="text-sm opacity-60 mt-2">{meal.description}</p>
                  )}

                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/edit-meal/${meal.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate('/log-meal')}
                    >
                      Log This Meal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
