import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { SettingsClient } from '@/components/SettingsClient'
import type { Plan } from '@/types'

export default async function SettingsPage() {
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
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [{ data: userData }, { data: profileData }, { data: shares }, { data: voiceClone }] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('voice_profiles').select('profile_json, accuracy_score').eq('user_id', authUser.id).single(),
      supabase.from('shared_mirrors').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      supabase.from('voice_clones').select('id, created_at').eq('user_id', authUser.id).maybeSingle(),
    ])

  if (!userData) redirect('/login')

  return (
    <Suspense>
      <SettingsClient
        user={userData}
        voiceProfile={profileData}
        shares={shares ?? []}
        hasVoiceClone={!!voiceClone}
        plan={(userData.plan ?? 'free') as Plan}
      />
    </Suspense>
  )
}
