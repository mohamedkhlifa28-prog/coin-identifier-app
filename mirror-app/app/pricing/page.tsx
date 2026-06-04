import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { PricingClient } from '@/components/PricingClient'
import type { Plan } from '@/types'

export default async function PricingPage() {
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

  let currentPlan: Plan = 'free'
  if (user) {
    const { data } = await supabase.from('users').select('plan').eq('id', user.id).single()
    currentPlan = (data?.plan ?? 'free') as Plan
  }

  return <PricingClient currentPlan={currentPlan} isLoggedIn={!!user} />
}
