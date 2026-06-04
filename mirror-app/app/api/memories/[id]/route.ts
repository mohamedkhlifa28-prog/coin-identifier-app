/**
 * PATCH /api/memories/[id] — pin/unpin or update weight
 * DELETE /api/memories/[id] — delete a memory
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type Params = { params: Promise<{ id: string }> }

async function getSupabaseAndUser() {
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
  return { supabase, user }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const { supabase, user } = await getSupabaseAndUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { pinned, weight } = body

  const update: Record<string, unknown> = {}
  if (typeof pinned === 'boolean') {
    update.pinned = pinned
    update.weight = pinned ? 10 : 5
  }
  if (typeof weight === 'number') {
    update.weight = weight
  }

  const { error } = await supabase
    .from('memories')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const { supabase, user } = await getSupabaseAndUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
