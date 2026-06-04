/**
 * DELETE /api/account/delete
 * Permanently deletes the authenticated user's account and all data.
 * Uses service role to delete the Supabase auth record (cascades to all tables).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function DELETE(_request: NextRequest) {
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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Delete auth user first — if this fails, all data is still intact and the user can retry.
    // Deleting data first (old order) would leave an orphaned auth record on failure.
    const { error: authError } = await service.auth.admin.deleteUser(user.id)
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Auth record is gone; now delete the public user row (cascades to all child tables)
    await service.from('users').delete().eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
