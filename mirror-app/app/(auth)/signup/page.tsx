'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!data.user) {
        setError('Signup failed. Please try again.')
        return
      }

      // The database trigger handles inserting into users table
      router.push('/onboard')
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-light tracking-tight text-[#f0f0f0] mb-2">
          Mirror
        </h1>
        <p className="text-[#888888] text-sm">Build an AI version of yourself.</p>
      </div>

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-8">
        <h2 className="text-xl font-light text-[#f0f0f0] mb-6">Create your account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs uppercase tracking-widest text-[#888888] mb-2"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Alex"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-4 py-3 text-[#f0f0f0] placeholder-[#555] text-sm focus:border-[#a78bfa] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-widest text-[#888888] mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-4 py-3 text-[#f0f0f0] placeholder-[#555] text-sm focus:border-[#a78bfa] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-widest text-[#888888] mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-4 py-3 text-[#f0f0f0] placeholder-[#555] text-sm focus:border-[#a78bfa] focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-[#f87171] text-sm bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#a78bfa] hover:bg-[#9370f5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 text-sm transition-colors mt-2"
          >
            {loading ? 'Creating Mirror…' : 'Start building your Mirror'}
          </button>
        </form>

        <p className="text-center text-[#888888] text-sm mt-6">
          Already have one?{' '}
          <Link href="/login" className="text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-[#555] text-xs mt-6">
        By signing up you agree that Mirror will learn a lot about you.
        That&apos;s the point.
      </p>
    </div>
  )
}
