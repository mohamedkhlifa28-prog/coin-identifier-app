/**
 * POST /api/push/subscribe — store a Web Push subscription for a user
 * DELETE /api/push/subscribe — remove the subscription
 *
 * Setup: generate VAPID keys with `npx web-push generate-vapid-keys`
 * and add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to env vars.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await request.json()

  // Store subscription in user metadata (simple approach — no extra table needed)
  await supabase.auth.updateUser({
    data: { push_subscription: JSON.stringify(subscription) },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.auth.updateUser({ data: { push_subscription: null } })
  return NextResponse.json({ success: true })
}
