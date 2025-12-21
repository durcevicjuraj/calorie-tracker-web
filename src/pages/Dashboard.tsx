import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Calorie Tracker</h1>

            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6">
                <a href="#" className="text-sm font-medium text-blue-600">
                  Dashboard
                </a>
                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  Foods
                </a>
                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  Meals
                </a>
                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  Goals
                </a>
              </nav>

              <div className="relative dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium cursor-pointer hover:bg-blue-700 transition"
                >
                  {user?.email?.[0].toUpperCase()}
                </div>
                <ul
                  tabIndex={0}
                  className="mt-3 z-[1] p-2 shadow-lg dropdown-content bg-white rounded-lg w-52 border border-gray-200"
                >
                  <li className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                  </li>
                  <li>
                    <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer">
                      Settings
                    </a>
                  </li>
                  <li>
                    <a
                      onClick={signOut}
                      className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer"
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
          <h2 className="text-2xl font-bold text-gray-900">Today's Overview</h2>
          <p className="text-gray-600 mt-1">
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
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Calories</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">/ 2000 kcal</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Today
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{ width: '0%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">0% of daily goal</p>
          </div>

          {/* Protein */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600">Protein</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">/ 150g</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all"
                style={{ width: '0%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">0% of daily goal</p>
          </div>

          {/* Meals Logged */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600">Meals Logged</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">meals</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Breakfast
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Lunch
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Dinner
              </span>
            </div>
          </div>
        </div>

        {/* Macronutrients */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Macronutrients
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Protein</span>
                <span className="text-sm text-gray-500">0 / 150g</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Carbs</span>
                <span className="text-sm text-gray-500">0 / 250g</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-amber-500 h-2.5 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Fats</span>
                <span className="text-sm text-gray-500">0 / 65g</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-purple-600 h-2.5 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-sm">
              + Log Meal
            </button>
            <button className="bg-white text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition font-medium text-sm border border-gray-200">
              + Add Food
            </button>
            <button className="bg-white text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition font-medium text-sm border border-gray-200">
              View Stats
            </button>
            <button className="bg-white text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition font-medium text-sm border border-gray-200">
              Set Goals
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-gray-300 border-dashed rounded"></div>
            </div>
            <p className="text-gray-600 font-medium">No meals logged yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start tracking by logging your first meal
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
