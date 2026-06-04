'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Memory } from '@/types'

interface UseMemoriesOptions {
  limit?: number
  tag?: string | null
  pinned?: boolean
  search?: string
}

export function useMemories(userId: string | null, options: UseMemoriesOptions = {}) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { limit = 100, tag, pinned, search } = options

  const fetchMemories = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('memories')
        .select('id, user_id, quote, context, tags, weight, session_id, pinned, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (pinned) {
        query = query.eq('pinned', true)
      }

      const { data, error: dbError } = await query

      if (dbError) throw new Error(dbError.message)

      let results = (data ?? []) as Memory[]

      if (tag) {
        results = results.filter((m) => m.tags?.includes(tag))
      }

      if (search) {
        const q = search.toLowerCase()
        results = results.filter(
          (m) =>
            m.quote.toLowerCase().includes(q) ||
            m.context?.toLowerCase().includes(q) ||
            m.tags?.some((t: string) => t.toLowerCase().includes(q))
        )
      }

      setMemories(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories')
    } finally {
      setLoading(false)
    }
  }, [userId, limit, tag, pinned, search])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  async function pinMemory(id: string, pinned: boolean) {
    const { error: dbError } = await supabase
      .from('memories')
      .update({ pinned, weight: pinned ? 10 : 5 })
      .eq('id', id)

    if (!dbError) {
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, pinned, weight: pinned ? 10 : 5 } : m))
      )
    }
    return !dbError
  }

  async function deleteMemory(id: string) {
    const { error: dbError } = await supabase.from('memories').delete().eq('id', id)

    if (!dbError) {
      setMemories((prev) => prev.filter((m) => m.id !== id))
    }
    return !dbError
  }

  return { memories, loading, error, refetch: fetchMemories, pinMemory, deleteMemory }
}
