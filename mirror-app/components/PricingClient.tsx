'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/types'

interface PricingClientProps {
  currentPlan: Plan
  isLoggedIn: boolean
}

const PLANS = [
  {
    key: 'free' as Plan,
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Start building your Mirror.',
    color: '#888888',
    features: [
      '10 chat messages per day',
      'Voice profile + onboarding',
      'Memory Vault (last 30 days)',
      'Basic accuracy tracking',
    ],
    missing: [
      'Contradiction detector',
      'Content Generator',
      'Share your Mirror',
      'Voice cloning',
    ],
  },
  {
    key: 'pro' as Plan,
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    description: 'The full Mirror experience.',
    color: '#a78bfa',
    highlight: true,
    features: [
      'Unlimited chat messages',
      'Full Memory Vault + all tabs',
      'Contradiction detector',
      'Content Generator',
      'Up to 3 shared mirrors',
      'Weekly Mirror report',
    ],
    missing: ['Voice cloning', 'Mirror API access'],
  },
  {
    key: 'platinum' as Plan,
    name: 'Platinum',
    price: '$24.99',
    period: '/month',
    description: 'Mirror is fully, irreversibly you.',
    color: '#fbbf24',
    features: [
      'Everything in Pro',
      'Voice cloning via ElevenLabs',
      'Unlimited shared mirrors',
      'Memory export as JSON',
      'Mirror API access (personal key)',
      'Priority support',
    ],
    missing: [],
  },
]

export function PricingClient({ currentPlan, isLoggedIn }: PricingClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(plan: Plan) {
    if (!isLoggedIn) {
      router.push(`/signup?redirect=/pricing`)
      return
    }
    if (plan === 'free') return

    setLoading(plan)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 animate-fade-in-up">
          <Link href={isLoggedIn ? '/chat' : '/'} className="text-xs text-[#555] hover:text-[#888] mb-8 inline-block transition-colors">
            ← {isLoggedIn ? 'Back to Chat' : 'Back'}
          </Link>
          <h1 className="text-4xl font-thin tracking-tight text-[#f0f0f0] mt-4 mb-3">
            The longer you use Mirror, the more it costs to leave.
          </h1>
          <p className="text-[#888888] text-base font-light">
            Pick the plan that matches how deep you want to go.
          </p>
        </div>

        {error && (
          <p className="text-center text-[#f87171] text-sm mb-8 bg-[#f87171]/10 border border-[#f87171]/20 rounded-xl px-4 py-3 max-w-md mx-auto">
            {error}
          </p>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key
            const isHigher =
              (plan.key === 'pro' && currentPlan === 'free') ||
              (plan.key === 'platinum' && currentPlan !== 'platinum')

            return (
              <div
                key={plan.key}
                className={`relative bg-[#111111] rounded-2xl p-7 flex flex-col border transition-all ${
                  plan.highlight
                    ? 'border-[#a78bfa]/40'
                    : 'border-[#1f1f1f]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#a78bfa] text-white text-[10px] font-medium uppercase tracking-widest px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: plan.color }}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-3xl font-light text-[#f0f0f0]">{plan.price}</span>
                    <span className="text-[#888888] text-sm pb-1">{plan.period}</span>
                  </div>
                  <p className="text-sm text-[#888888]">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 shrink-0" style={{ color: plan.color }}>✓</span>
                      <span className="text-[#f0f0f0]">{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm opacity-30">
                      <span className="mt-0.5 shrink-0 text-[#888888]">✕</span>
                      <span className="text-[#888888]">{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full text-center py-3 text-sm text-[#888888] border border-[#1f1f1f] rounded-xl">
                    Current plan
                  </div>
                ) : plan.key === 'free' ? (
                  <Link
                    href={isLoggedIn ? '/chat' : '/signup'}
                    className="block w-full text-center py-3 text-sm text-[#888888] border border-[#1f1f1f] hover:border-[#333] rounded-xl transition-colors"
                  >
                    {isLoggedIn ? 'You&apos;re on free' : 'Get started free'}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={!!loading}
                    className="w-full py-3 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                    style={{
                      background: isHigher ? plan.color : 'transparent',
                      color: isHigher ? '#fff' : plan.color,
                      border: isHigher ? 'none' : `1px solid ${plan.color}40`,
                    }}
                  >
                    {loading === plan.key
                      ? 'Redirecting…'
                      : isHigher
                        ? `Upgrade to ${plan.name}`
                        : `Switch to ${plan.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-[#555] text-xs mt-10">
          Cancel anytime · No hidden fees · Billed monthly
        </p>
      </div>
    </div>
  )
}
