/**
 * GET /api/cron/detect-contradictions
 * Weekly cron job: finds contradicting memory pairs for all users.
 * Secured by CRON_SECRET header (set this in Vercel cron config).
 * vercel.json schedule: "0 0 * * 0" (every Sunday midnight)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { parseClaudeJSON } from '@/lib/utils'

interface MemoryRow { id: string; quote: string }
interface ContradictionResult { memory_id_1: string; memory_id_2: string; explanation: string }

async function detectForUser(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) {
  const { data: memories } = await supabase
    .from('memories')
    .select('id, quote')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!memories || memories.length < 2) return

  // Process in batches of 20
  const BATCH = 20
  for (let i = 0; i < memories.length; i += BATCH) {
    const batch = (memories as MemoryRow[]).slice(i, i + BATCH)
    const list = batch.map((m, idx) => `[${idx}] id=${m.id}: "${m.quote}"`).join('\n')

    const prompt = `Find pairs of statements that directly contradict each other.
Return JSON ONLY, no preamble, no backticks:
[{ "memory_id_1": string, "memory_id_2": string, "explanation": string }]

Only flag genuine contradictions — not just different moods or contexts.
Return [] if none found.

Statements:
${list}`

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0]
    if (raw.type !== 'text') continue

    const results = parseClaudeJSON<ContradictionResult[]>(raw.text)

    for (const r of results) {
      // Skip if this pair already exists
      const { data: existing } = await supabase
        .from('contradictions')
        .select('id')
        .eq('user_id', userId)
        .eq('memory_id_1', r.memory_id_1)
        .eq('memory_id_2', r.memory_id_2)
        .maybeSingle()

      if (existing) continue

      await supabase.from('contradictions').insert({
        user_id: userId,
        memory_id_1: r.memory_id_1,
        memory_id_2: r.memory_id_2,
        explanation: r.explanation,
      })
    }
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get all users who have memories
  const { data: userIds } = await supabase
    .from('memories')
    .select('user_id')
    .limit(1000)

  const uniqueUsers = [...new Set(userIds?.map((r: { user_id: string }) => r.user_id) ?? [])]

  let processed = 0
  for (const userId of uniqueUsers) {
    try {
      await detectForUser(supabase, userId)
      processed++
    } catch {
      // Continue with other users on failure
    }
  }

  return NextResponse.json({ processed })
}
