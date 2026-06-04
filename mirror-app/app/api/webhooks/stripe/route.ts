/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler. Verifies signature, then updates users.plan
 * based on subscription lifecycle events.
 * This route is in the public paths list (no auth proxy) so Stripe can reach it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Stripe from 'stripe'

function getStripeInstance() {
  return new (require('stripe').default)(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
  }) as Stripe
}

function getPlanFromPriceId(priceId: string): 'pro' | 'platinum' | 'free' {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_PLATINUM_PRICE_ID) return 'platinum'
  return 'free'
}

async function updateUserPlan(
  supabase: ReturnType<typeof createServiceClient>,
  customerId: string,
  plan: 'free' | 'pro' | 'platinum'
) {
  await supabase.from('users').update({ plan }).eq('stripe_customer_id', customerId)
}

export async function POST(request: NextRequest) {
  const stripeInstance = getStripeInstance()
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripeInstance.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : ''}` },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const priceId = subscription.items.data[0]?.price.id
      if (!priceId) break

      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const plan = getPlanFromPriceId(priceId)
        await updateUserPlan(supabase, customerId, plan)
      } else if (
        subscription.status === 'canceled' ||
        subscription.status === 'unpaid' ||
        subscription.status === 'past_due'
      ) {
        await updateUserPlan(supabase, customerId, 'free')
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      await updateUserPlan(supabase, customerId, 'free')
      break
    }

    case 'checkout.session.completed': {
      // Fallback: ensure plan is set if webhook for subscription.created was missed
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.customer) {
        const plan = (session.metadata?.plan as 'pro' | 'platinum') ?? 'pro'
        await updateUserPlan(supabase, session.customer as string, plan)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
