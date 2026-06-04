/**
 * POST /api/stripe/checkout
 * Creates a Stripe checkout session for a subscription upgrade.
 * Returns { url } — client redirects there.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import type { PlanKey } from '@/lib/stripe'

const PRICE_IDS: Record<Exclude<PlanKey, 'free'>, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  platinum: process.env.STRIPE_PLATINUM_PRICE_ID,
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) =>
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await request.json() as { plan: PlanKey }

    if (plan === 'free') {
      return NextResponse.json({ error: 'Cannot checkout free plan' }, { status: 400 })
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId) {
      return NextResponse.json({ error: `No price ID configured for plan: ${plan}` }, { status: 500 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('email, name, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Reuse existing Stripe customer or create a new one
    let customerId = userData.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?upgraded=${plan}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
