/**
 * POST /api/share — create or toggle a shared mirror link
 * GET  /api/share — list the user's active shared mirrors
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateSlug } from '@/lib/utils'

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

export async function GET() {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('shared_mirrors')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ shares: data ?? [] })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check plan limits
  const { data: userData } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()
  const plan = userData?.plan ?? 'free'

  if (plan === 'free') {
    return NextResponse.json(
      { error: 'PLAN_LIMIT', message: 'Sharing requires a Pro or Platinum plan.' },
      { status: 403 }
    )
  }

  if (plan === 'pro') {
    const { count } = await supabase
      .from('shared_mirrors')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'PLAN_LIMIT', message: 'Pro plan allows up to 3 active shared mirrors.' },
        { status: 403 }
      )
    }
  }

  const { action, shareId } = await request.json() as {
    action: 'create' | 'toggle' | 'delete'
    shareId?: string
  }

  if (action === 'create') {
    const slug = generateSlug()
    const { data, error } = await supabase
      .from('shared_mirrors')
      .insert({ user_id: user.id, slug, is_active: true })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ share: data })
  }

  if (action === 'toggle' && shareId) {
    const { data: existing } = await supabase
      .from('shared_mirrors')
      .select('is_active')
      .eq('id', shareId)
      .eq('user_id', user.id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data } = await supabase
      .from('shared_mirrors')
      .update({ is_active: !existing.is_active })
      .eq('id', shareId)
      .select()
      .single()
    return NextResponse.json({ share: data })
  }

  if (action === 'delete' && shareId) {
    await supabase
      .from('shared_mirrors')
      .delete()
      .eq('id', shareId)
      .eq('user_id', user.id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
