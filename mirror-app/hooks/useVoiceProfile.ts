'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { VoiceProfile } from '@/types'

export function useVoiceProfile(userId: string | null) {
  const [profile, setProfile] = useState<VoiceProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const uid = userId

    async function fetch() {
      try {
        const { data, error: dbError } = await supabase
          .from('voice_profiles')
          .select('*')
          .eq('user_id', uid)
          .single()

        if (dbError && dbError.code !== 'PGRST116') {
          throw new Error(dbError.message)
        }
        setProfile(data ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load voice profile')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [userId])

  return { profile, loading, error }
}
