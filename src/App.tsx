import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Ingredients from './pages/Ingredients'
import Foods from './pages/Foods'
import Meals from './pages/Meals'
import Logs from './pages/Logs'
import LogMeal from './pages/LogMeal'
import AddMeal from './pages/AddMeal'
import AddFood from './pages/AddFood'
import AddIngredient from './pages/AddIngredient'
import EditMeal from './pages/EditMeal'
import EditFood from './pages/EditFood'
import EditIngredient from './pages/EditIngredient'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ingredients" element={<Ingredients />} />
        <Route path="/foods" element={<Foods />} />
        <Route path="/meals" element={<Meals />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/log-meal" element={<LogMeal />} />
        <Route path="/add-meal" element={<AddMeal />} />
        <Route path="/add-food" element={<AddFood />} />
        <Route path="/add-ingredient" element={<AddIngredient />} />
        <Route path="/edit-ingredient/:id" element={<EditIngredient />} />
        <Route path="/edit-food/:id" element={<EditFood />} />
        <Route path="/edit-meal/:id" element={<EditMeal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
