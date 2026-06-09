import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

/**
 * Creates a Supabase client that works for both web (cookies) and mobile (Bearer token).
 * Mobile apps send `Authorization: Bearer <access_token>` — this passes the token
 * as a global header so RLS works correctly for all subsequent DB queries.
 */
export async function createSupabaseForRequest(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerToken) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      }
    )
    // Must pass the token explicitly — getUser() won't read global headers
    const { data: { user } } = await supabase.auth.getUser(bearerToken)
    return { supabase, user }
  }

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
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}
