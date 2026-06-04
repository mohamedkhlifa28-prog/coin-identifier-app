import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { MirrorChat } from '@/components/MirrorChat'
import type { User, VoiceProfile } from '@/types'

export default async function ChatPage() {
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

  // Fetch user record and voice profile in parallel
  const [userResult, profileResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', authUser.id).single(),
    supabase.from('voice_profiles').select('*').eq('user_id', authUser.id).single(),
  ])

  if (!userResult.data) redirect('/login')
  if (!profileResult.data) redirect('/onboard')

  // Update mirror_age_days and last_active, handle streak
  const lastActive = new Date(userResult.data.last_active ?? userResult.data.created_at)
  const now = new Date()
  const daysSinceActive = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  )
  const firstSession = new Date(userResult.data.created_at)
  const mirrorAgeDays = Math.floor(
    (now.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24)
  )

  let newStreak = userResult.data.streak_days ?? 0
  if (daysSinceActive === 0) {
    // Same day — streak unchanged
  } else if (daysSinceActive === 1) {
    newStreak += 1
  } else {
    newStreak = 1
  }

  await supabase
    .from('users')
    .update({
      last_active: now.toISOString(),
      mirror_age_days: mirrorAgeDays,
      streak_days: newStreak,
    })
    .eq('id', authUser.id)

  // Accuracy decay: -2% if user hasn't chatted in 7+ days
  if (daysSinceActive >= 7) {
    const currentAccuracy = profileResult.data.accuracy_score ?? 40
    const decayed = Math.max(40, currentAccuracy - 2)
    if (decayed !== currentAccuracy) {
      await supabase
        .from('voice_profiles')
        .update({ accuracy_score: decayed })
        .eq('user_id', authUser.id)
      profileResult.data.accuracy_score = decayed
    }
  }

  const user: User = {
    ...userResult.data,
    streak_days: newStreak,
    mirror_age_days: mirrorAgeDays,
  }

  return <MirrorChat user={user} voiceProfile={profileResult.data as VoiceProfile} />
}
