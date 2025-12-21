import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      } else {
        if (!name.trim()) {
          setError('Please enter your name')
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }

        const { error } = await signUp(email, password, name)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Account created successfully!')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-base-200 p-6">
      <form onSubmit={handleSubmit} className="card bg-base-100 w-full max-w-sm shadow-xl">
        <div className="card-body gap-3">
          <h2 className="card-title">{isLogin ? 'Login' : 'Create account'}</h2>

          {!isLogin && (
            <input
              className="input input-bordered"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
              disabled={loading}
            />
          )}

          <input
            className="input input-bordered"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <input
            className="input input-bordered"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          {!isLogin && (
            <input
              className="input input-bordered"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={!isLogin}
              disabled={loading}
            />
          )}

          {error && <p className="text-error text-sm">{error}</p>}
          {message && <p className="text-success text-sm">{message}</p>}

          <div className="card-actions justify-between">
            <button
              type="button"
              className="link"
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
                setMessage(null)
              }}
            >
              {isLogin ? 'Create account' : 'Have an account?'}
            </button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? (isLogin ? 'Signing in…' : 'Creating account…') : (isLogin ? 'Sign in' : 'Register')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
