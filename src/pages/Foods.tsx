import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Food {
  id: string
  name: string
  brand_name: string | null
  is_composite: boolean
  image_url: string | null
  categories: {
    name: string
  }
}

export default function Foods() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchFoods()
  }, [])

  async function fetchFoods() {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*, categories(name)')
        .order('name')

      if (error) throw error
      setFoods(data || [])
    } catch (e) {
      console.error('Error fetching foods:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    food.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
                <button onClick={() => navigate('/ingredients')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
                  Ingredients
                </button>
                <button onClick={() => navigate('/foods')} className="text-sm font-medium text-primary">
                  Foods
                </button>
                <button onClick={() => navigate('/meals')} className="text-sm font-medium opacity-60 hover:opacity-100 transition">
                  Meals
                </button>
              </nav>

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
            <h2 className="text-2xl font-bold">Foods</h2>
            <p className="opacity-60 mt-1">Browse and manage your foods</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/add-food')}
          >
            + Add Food
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search foods..."
            className="input input-bordered w-full max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Foods List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center py-12">
              <p className="text-lg opacity-60">
                {searchQuery ? 'No foods found matching your search.' : 'No foods yet.'}
              </p>
              {!searchQuery && (
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => navigate('/add-food')}
                >
                  Add Your First Food
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFoods.map((food) => (
              <div key={food.id} className="card bg-base-100 shadow-sm">
                {food.image_url && (
                  <figure className="h-48">
                    <img
                      src={food.image_url}
                      alt={food.name}
                      className="w-full h-full object-cover"
                    />
                  </figure>
                )}
                <div className="card-body">
                  <h3 className="card-title text-lg">
                    {food.name}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {food.brand_name && (
                      <div className="badge badge-outline badge-sm">{food.brand_name}</div>
                    )}
                    <div className={`badge badge-sm ${food.is_composite ? 'badge-secondary' : 'badge-neutral'}`}>
                      {food.is_composite ? 'Composite' : 'Simple'}
                    </div>
                    <div className="badge badge-ghost badge-sm">{food.categories?.name}</div>
                  </div>

                  <p className="text-sm opacity-60 mt-2">
                    {food.is_composite
                      ? 'Made from multiple ingredients'
                      : 'Single ingredient food'}
                  </p>

                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/edit-food/${food.id}`)}
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
