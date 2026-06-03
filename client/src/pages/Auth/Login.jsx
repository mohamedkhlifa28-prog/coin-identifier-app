import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setIsLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/scan', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Invalid email or password.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <span className="text-5xl mb-3">🪙</span>
        <h1 className="text-3xl font-bold font-display text-[#D4A017] tracking-wide">
          CoinVault
        </h1>
        <p className="text-gray-500 text-sm font-body mt-1">
          AI-powered coin identification
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold font-display text-white mb-6">Sign In</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 font-body mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017] transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-400 font-body mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 pr-12 text-white font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm font-body">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#D4A017] text-black font-bold py-3.5 rounded-xl font-body text-base active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm font-body mt-6">
          Don't have an account?{' '}
          <Link
            to="/auth/register"
            className="text-[#D4A017] font-medium hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
