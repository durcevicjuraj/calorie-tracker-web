import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface LogEntry {
  id: string
  meal_name: string
  quantity: number
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
  consumed_date: string
  notes: string | null
  created_at: string
}

const ITEMS_PER_PAGE = 10

export default function Logs() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchLogs()
    }
  }, [user, currentPage])

  async function fetchLogs() {
    try {
      setLoading(true)

      // Get total count
      const { count } = await supabase
        .from('user_consumption')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      setTotalCount(count || 0)

      // Get paginated logs
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error } = await supabase
        .from('user_consumption')
        .select('*')
        .eq('user_id', user?.id)
        .order('consumed_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setLogs(data || [])
    } catch (e) {
      console.error('Error fetching logs:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this log entry?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_consumption')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh the list
      fetchLogs()
    } catch (e: any) {
      console.error('Error deleting log:', e)
      alert('Failed to delete log entry')
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

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
            <h2 className="text-2xl font-bold">Meal Logs</h2>
            <p className="opacity-60 mt-1">View and manage your consumption history</p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/')}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : logs.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center py-12">
              <p className="text-lg opacity-60">No logs yet.</p>
              <button
                className="btn btn-primary mt-4"
                onClick={() => navigate('/log-meal')}
              >
                Log Your First Meal
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{log.meal_name}</h3>
                          <span className="badge badge-neutral">{log.consumed_date}</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                          <div>
                            <span className="opacity-60">Calories:</span>
                            <span className="font-medium ml-2">{Number(log.calories).toFixed(2)} kcal</span>
                          </div>
                          <div>
                            <span className="opacity-60">Protein:</span>
                            <span className="font-medium ml-2">{Number(log.protein).toFixed(2)}g</span>
                          </div>
                          <div>
                            <span className="opacity-60">Carbs:</span>
                            <span className="font-medium ml-2">{Number(log.carbs).toFixed(2)}g</span>
                          </div>
                          <div>
                            <span className="opacity-60">Fat:</span>
                            <span className="font-medium ml-2">{Number(log.fat).toFixed(2)}g</span>
                          </div>
                        </div>

                        {log.notes && (
                          <p className="text-sm opacity-60 mt-3">
                            <span className="font-medium">Notes:</span> {log.notes}
                          </p>
                        )}
                      </div>

                      <button
                        className="btn btn-sm btn-ghost btn-square text-error"
                        onClick={() => handleDelete(log.id)}
                        title="Delete log"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  className="btn btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}

            <p className="text-center text-sm opacity-60 mt-4">
              Showing {logs.length} of {totalCount} total logs
            </p>
          </>
        )}
      </main>
    </div>
  )
}
