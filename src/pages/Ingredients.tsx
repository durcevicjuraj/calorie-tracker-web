import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Ingredient {
  id: string
  name: string
  brand_name: string | null
  category: string
  serving_amount: number
  serving_unit: string
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
  image_url: string | null
}

export default function Ingredients() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchIngredients()
  }, [])

  async function fetchIngredients() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name')

      if (error) throw error
      setIngredients(data || [])
    } catch (e) {
      console.error('Error fetching ingredients:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ingredient.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
                <button onClick={() => navigate('/ingredients')} className="text-sm font-medium text-primary">
                  Ingredients
                </button>
                <button onClick={() => navigate('/foods')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
                  Foods
                </button>
                <button onClick={() => navigate('/meals')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
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
                    <button onClick={() => navigate('/ingredients')} className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-base-200 rounded">
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
            <h2 className="text-2xl font-bold">Ingredients</h2>
            <p className="opacity-60 mt-1">Browse and manage your ingredients</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/add-ingredient')}
          >
            + Add Ingredient
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search ingredients..."
            className="input input-bordered w-full max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Ingredients List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center py-12">
              <p className="text-lg opacity-60">
                {searchQuery ? 'No ingredients found matching your search.' : 'No ingredients yet.'}
              </p>
              {!searchQuery && (
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => navigate('/add-ingredient')}
                >
                  Add Your First Ingredient
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIngredients.map((ingredient) => (
              <div key={ingredient.id} className="card bg-base-100 shadow-sm">
                {ingredient.image_url && (
                  <figure className="h-48">
                    <img
                      src={ingredient.image_url}
                      alt={ingredient.name}
                      className="w-full h-full object-cover"
                    />
                  </figure>
                )}
                <div className="card-body">
                  <h3 className="card-title text-lg">
                    {ingredient.name}
                    {ingredient.brand_name && (
                      <div className="badge badge-outline badge-sm">{ingredient.brand_name}</div>
                    )}
                  </h3>
                  <p className="text-sm opacity-60">{ingredient.category}</p>

                  <div className="divider my-2"></div>

                  <div className="text-sm">
                    <p className="font-medium mb-2">Per {ingredient.serving_amount}{ingredient.serving_unit}:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-60">Calories:</span>
                        <span className="font-medium ml-2">{Number(ingredient.calories).toFixed(2)} kcal</span>
                      </div>
                      <div>
                        <span className="opacity-60">Protein:</span>
                        <span className="font-medium ml-2">{Number(ingredient.protein).toFixed(2)}g</span>
                      </div>
                      <div>
                        <span className="opacity-60">Carbs:</span>
                        <span className="font-medium ml-2">{Number(ingredient.carbs).toFixed(2)}g</span>
                      </div>
                      <div>
                        <span className="opacity-60">Fat:</span>
                        <span className="font-medium ml-2">{Number(ingredient.fat).toFixed(2)}g</span>
                      </div>
                      {ingredient.fiber !== null && (
                        <div>
                          <span className="opacity-60">Fiber:</span>
                          <span className="font-medium ml-2">{Number(ingredient.fiber).toFixed(2)}g</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/edit-ingredient/${ingredient.id}`)}
                    >
                      Edit
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
