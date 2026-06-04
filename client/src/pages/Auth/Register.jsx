import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

function PasswordStrength({ password }) {
  const checks = useMemo(() => {
    return [
      { label: 'At least 8 characters', ok: password.length >= 8 },
      { label: 'Contains uppercase', ok: /[A-Z]/.test(password) },
      { label: 'Contains number', ok: /\d/.test(password) },
      { label: 'Contains special char', ok: /[^A-Za-z0-9]/.test(password) },
    ]
  }, [password])

  const strength = checks.filter((c) => c.ok).length
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][strength]

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={[
              'flex-1 h-1 rounded-full transition-all',
              i <= strength ? strengthColor : 'bg-[#3A3A3A]',
            ].join(' ')}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-xs font-body ${['', 'text-red-400', 'text-yellow-400', 'text-blue-400', 'text-green-400'][strength]}`}>
          {strengthLabel} password
        </p>
      )}
      <div className="space-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.ok ? (
              <Check size={12} className="text-green-400 shrink-0" />
            ) : (
              <X size={12} className="text-gray-600 shrink-0" />
            )}
            <span className={`text-xs font-body ${c.ok ? 'text-gray-400' : 'text-gray-600'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    try {
      await register(email.trim(), password, name.trim())
      navigate('/scan', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <span className="text-5xl mb-3">🪙</span>
        <h1 className="text-3xl font-bold font-display text-[#D4A017] tracking-wide">
          CoinVault
        </h1>
      </div>

      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold font-display text-white mb-6">Create Account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 font-body mb-1.5" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Chen"
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017] transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 font-body mb-1.5" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
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
            <label className="block text-sm text-gray-400 font-body mb-1.5" htmlFor="reg-password">
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 pr-12 text-white font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-gray-400 font-body mb-1.5" htmlFor="confirm-password">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={[
                  'w-full bg-[#1A1A1A] border rounded-xl px-4 py-3 pr-12 text-white font-body placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors',
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : confirmPassword && confirmPassword === password
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'border-[#2A2A2A] focus:border-[#D4A017] focus:ring-[#D4A017]',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-red-400 text-xs mt-1 font-body">Passwords do not match</p>
            )}
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
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm font-body mt-6">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="text-[#D4A017] font-medium hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
