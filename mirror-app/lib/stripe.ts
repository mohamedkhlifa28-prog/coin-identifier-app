import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '10 chat messages per day',
      'Memory Vault: last 30 days',
      'Basic voice profile',
    ],
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    features: [
      'Unlimited chat messages',
      'Full Memory Vault + all tabs',
      'Contradiction detector',
      'Content Generator',
      'Up to 3 shared mirrors',
    ],
  },
  platinum: {
    name: 'Platinum',
    price: 24.99,
    priceId: process.env.STRIPE_PLATINUM_PRICE_ID ?? '',
    features: [
      'Everything in Pro',
      'Voice cloning via ElevenLabs',
      'Unlimited shared mirrors',
      'Memory export as JSON',
      'Mirror API access',
    ],
  },
} as const

export type PlanKey = keyof typeof PLANS
