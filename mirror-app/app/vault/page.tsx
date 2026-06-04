import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { VaultClient } from '@/components/VaultClient'
import type { Memory, Plan } from '@/types'

export default async function VaultPage() {
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
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (userData?.plan ?? 'free') as Plan
  const isFree = plan === 'free'

  // Free users see last 30 days only
  const cutoff = isFree
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    : undefined

  let query = supabase
    .from('memories')
    .select('id, user_id, quote, context, tags, weight, session_id, pinned, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (cutoff) query = query.gte('created_at', cutoff)

  const { count } = await supabase
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { data: memories } = await query

  return (
    <VaultClient
      initialMemories={(memories ?? []) as Memory[]}
      plan={plan}
      totalCount={count ?? 0}
    />
  )
}

