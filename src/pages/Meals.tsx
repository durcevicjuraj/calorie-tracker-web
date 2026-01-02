import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Meal {
  id: string
  name: string
  description: string | null
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
  image_url: string | null
  created_at: string
}

export default function Meals() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('name')
  const [showNutritionFilters, setShowNutritionFilters] = useState(false)

  // Nutrition range filters
  const [calorieMin, setCalorieMin] = useState('')
  const [calorieMax, setCalorieMax] = useState('')
  const [proteinMin, setProteinMin] = useState('')
  const [proteinMax, setProteinMax] = useState('')
  const [carbsMin, setCarbsMin] = useState('')
  const [carbsMax, setCarbsMax] = useState('')
  const [fatMin, setFatMin] = useState('')
  const [fatMax, setFatMax] = useState('')

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

  // Check if any nutrition filters are active
  const hasNutritionFilters = calorieMin || calorieMax || proteinMin || proteinMax || carbsMin || carbsMax || fatMin || fatMax

  // Filter and sort meals
  const filteredMeals = meals
    .filter(meal => {
      // Text search - includes name and description
      const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description?.toLowerCase().includes(searchQuery.toLowerCase())

      // Nutrition range filters
      const matchesCalories = (!calorieMin || meal.calories >= parseFloat(calorieMin)) &&
                              (!calorieMax || meal.calories <= parseFloat(calorieMax))
      const matchesProtein = (!proteinMin || meal.protein >= parseFloat(proteinMin)) &&
                             (!proteinMax || meal.protein <= parseFloat(proteinMax))
      const matchesCarbs = (!carbsMin || meal.carbs >= parseFloat(carbsMin)) &&
                           (!carbsMax || meal.carbs <= parseFloat(carbsMax))
      const matchesFat = (!fatMin || meal.fat >= parseFloat(fatMin)) &&
                         (!fatMax || meal.fat <= parseFloat(fatMax))

      return matchesSearch && matchesCalories && matchesProtein && matchesCarbs && matchesFat
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'calories-high':
          return b.calories - a.calories
        case 'calories-low':
          return a.calories - b.calories
        case 'protein-high':
          return b.protein - a.protein
        case 'protein-low':
          return a.protein - b.protein
        case 'carbs-high':
          return b.carbs - a.carbs
        case 'carbs-low':
          return a.carbs - b.carbs
        case 'fat-high':
          return b.fat - a.fat
        case 'fat-low':
          return a.fat - b.fat
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

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
                <button onClick={() => navigate('/history')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
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
                    <button onClick={() => navigate('/meals')} className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-base-200 rounded">
                      Meals
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/history')} className="block w-full text-left px-4 py-2 text-sm hover:bg-base-200 rounded">
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

        {/* Search and Filters */}
        <div className="card bg-base-100 shadow-sm mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="label">
                  <span className="label-text">Search</span>
                </label>
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="label">
                  <span className="label-text">Sort By</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="recent">Recently Added</option>
                  <option value="calories-high">Calories (High-Low)</option>
                  <option value="calories-low">Calories (Low-High)</option>
                  <option value="protein-high">Protein (High-Low)</option>
                  <option value="protein-low">Protein (Low-High)</option>
                  <option value="carbs-high">Carbs (High-Low)</option>
                  <option value="carbs-low">Carbs (Low-High)</option>
                  <option value="fat-high">Fat (High-Low)</option>
                  <option value="fat-low">Fat (Low-High)</option>
                </select>
              </div>
            </div>

            {/* Nutrition Range Filters */}
            <div className="mt-4">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowNutritionFilters(!showNutritionFilters)}
              >
                {showNutritionFilters ? '− Hide' : '+ Show'} Nutrition Filters
              </button>
            </div>

            {showNutritionFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {/* Calories Range */}
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Calories (kcal)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="input input-bordered input-sm w-full"
                      value={calorieMin}
                      onChange={(e) => setCalorieMin(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="input input-bordered input-sm w-full"
                      value={calorieMax}
                      onChange={(e) => setCalorieMax(e.target.value)}
                    />
                  </div>
                </div>

                {/* Protein Range */}
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Protein (g)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="input input-bordered input-sm w-full"
                      value={proteinMin}
                      onChange={(e) => setProteinMin(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="input input-bordered input-sm w-full"
                      value={proteinMax}
                      onChange={(e) => setProteinMax(e.target.value)}
                    />
                  </div>
                </div>

                {/* Carbs Range */}
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Carbs (g)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="input input-bordered input-sm w-full"
                      value={carbsMin}
                      onChange={(e) => setCarbsMin(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="input input-bordered input-sm w-full"
                      value={carbsMax}
                      onChange={(e) => setCarbsMax(e.target.value)}
                    />
                  </div>
                </div>

                {/* Fat Range */}
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Fat (g)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="input input-bordered input-sm w-full"
                      value={fatMin}
                      onChange={(e) => setFatMin(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="input input-bordered input-sm w-full"
                      value={fatMax}
                      onChange={(e) => setFatMax(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {(searchQuery || hasNutritionFilters) && (
              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="text-sm opacity-60">Active filters:</span>
                {searchQuery && (
                  <div className="badge badge-primary gap-2">
                    Search: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {calorieMin && (
                  <div className="badge badge-secondary gap-2">
                    Calories ≥ {calorieMin}
                    <button onClick={() => setCalorieMin('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {calorieMax && (
                  <div className="badge badge-secondary gap-2">
                    Calories ≤ {calorieMax}
                    <button onClick={() => setCalorieMax('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {proteinMin && (
                  <div className="badge badge-secondary gap-2">
                    Protein ≥ {proteinMin}g
                    <button onClick={() => setProteinMin('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {proteinMax && (
                  <div className="badge badge-secondary gap-2">
                    Protein ≤ {proteinMax}g
                    <button onClick={() => setProteinMax('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {carbsMin && (
                  <div className="badge badge-secondary gap-2">
                    Carbs ≥ {carbsMin}g
                    <button onClick={() => setCarbsMin('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {carbsMax && (
                  <div className="badge badge-secondary gap-2">
                    Carbs ≤ {carbsMax}g
                    <button onClick={() => setCarbsMax('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {fatMin && (
                  <div className="badge badge-secondary gap-2">
                    Fat ≥ {fatMin}g
                    <button onClick={() => setFatMin('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                {fatMax && (
                  <div className="badge badge-secondary gap-2">
                    Fat ≤ {fatMax}g
                    <button onClick={() => setFatMax('')} className="btn btn-ghost btn-xs">✕</button>
                  </div>
                )}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setSearchQuery('')
                    setCalorieMin('')
                    setCalorieMax('')
                    setProteinMin('')
                    setProteinMax('')
                    setCarbsMin('')
                    setCarbsMax('')
                    setFatMin('')
                    setFatMax('')
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
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
                {meal.image_url && (
                  <figure className="h-48">
                    <img
                      src={meal.image_url}
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                  </figure>
                )}
                <div className="card-body">
                  <h3 className="card-title text-lg">
                    {meal.name}
                  </h3>

                  {meal.description && (
                    <p className="text-sm opacity-60 mt-2">{meal.description}</p>
                  )}

                  <div className="divider my-2"></div>

                  <div className="text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-60">Calories:</span>
                        <span className="font-medium ml-2">{Number(meal.calories).toFixed(2)} kcal</span>
                      </div>
                      <div>
                        <span className="opacity-60">Protein:</span>
                        <span className="font-medium ml-2">{Number(meal.protein).toFixed(2)}g</span>
                      </div>
                      <div>
                        <span className="opacity-60">Carbs:</span>
                        <span className="font-medium ml-2">{Number(meal.carbs).toFixed(2)}g</span>
                      </div>
                      <div>
                        <span className="opacity-60">Fat:</span>
                        <span className="font-medium ml-2">{Number(meal.fat).toFixed(2)}g</span>
                      </div>
                    </div>
                  </div>

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
