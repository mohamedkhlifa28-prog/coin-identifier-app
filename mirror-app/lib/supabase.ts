import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

type BrowserClient = ReturnType<typeof createBrowserClient>

// Lazy singleton — avoids crashing during Next.js SSG when env vars aren't set
// Uses createBrowserClient so sessions are stored in cookies (not localStorage),
// making them readable by the server-side middleware.
let _supabase: BrowserClient | null = null

export function getSupabase(): BrowserClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _supabase = createBrowserClient(url, key)
  }
  return _supabase
}

// Convenience proxy — equivalent to calling getSupabase() directly
export const supabase = new Proxy({} as BrowserClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof BrowserClient]
  },
})

// Server client — uses service role key, bypasses RLS
// Only import this in server-side API routes
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
