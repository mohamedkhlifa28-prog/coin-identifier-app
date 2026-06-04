/**
 * POST /api/memories/extract
 * Background job (fire-and-forget from client). Does two things:
 * 1. Extracts notable quotes/moments from a user message → saves to memories
 * 2. Extracts new personality traits → merges into voice profile, increments accuracy
 * Also saves the full conversation to the conversations table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { generateEmbedding } from '@/lib/openai'
import { parseClaudeJSON } from '@/lib/utils'
import { sendPushNotification } from '@/lib/webpush'
import type { VoiceProfileData } from '@/types'

interface ExtractedMemory {
  quote: string
  context: string
  tags: string[]
  weight: number
}

interface ExtractedTraits {
  new_traits: string[]
  updated_fields: Partial<VoiceProfileData>
}

export async function POST(request: NextRequest) {
  try {
    // This route is called by the client after receiving the AI response.
    // It uses the service role key since the user's session cookie isn't forwarded.
    const body = await request.json()
    const { userId, userMessage, assistantMessage, sessionId, conversationHistory } = body as {
      userId: string
      userMessage: string
      assistantMessage: string
      sessionId: string
      conversationHistory: { role: string; content: string; timestamp: string }[]
    }

    if (!userId || !userMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Run memory extraction and trait extraction in parallel
    const [memoriesResult, traitsResult] = await Promise.allSettled([
      extractMemories(userMessage),
      extractTraits(userMessage, assistantMessage, userId, supabase),
    ])

    // Save extracted memories with embeddings
    if (memoriesResult.status === 'fulfilled' && memoriesResult.value.length > 0) {
      await Promise.allSettled(
        memoriesResult.value.map(async (mem) => {
          try {
            const embedding = await generateEmbedding(mem.quote)
            await supabase.from('memories').insert({
              user_id: userId,
              quote: mem.quote,
              context: mem.context || null,
              tags: mem.tags ?? [],
              weight: mem.weight ?? 5,
              session_id: sessionId || null,
              embedding: embedding as unknown as number[],
            })
          } catch {
            // Silently skip failed memory insertions
          }
        })
      )
    }

    // Check memory milestones (100, 500, 1000)
    const { count: memoryCount } = await supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const MILESTONES = [100, 500, 1000]
    if (memoryCount && MILESTONES.includes(memoryCount)) {
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
      const pushSub = authUser?.user_metadata?.push_subscription as string | undefined
      if (pushSub) {
        await sendPushNotification(pushSub, {
          title: `${memoryCount} memories`,
          body: `Your Mirror has captured ${memoryCount} moments from you.`,
          url: '/vault',
        })
      }
    }

    // Save conversation to DB (upsert by session_id stored as the conversation id)
    const allMessages = [
      ...conversationHistory,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() },
    ]

    await supabase
      .from('conversations')
      .upsert(
        {
          id: sessionId,
          user_id: userId,
          messages_json: allMessages,
          session_date: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    // Increment total_sessions on voice profile
    await supabase.rpc('increment_voice_profile_sessions', { uid: userId })

    return NextResponse.json({ success: true })
  } catch (err) {
    // Background job — swallow errors gracefully
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function extractMemories(userMessage: string): Promise<ExtractedMemory[]> {
  const prompt = `From this user message, extract any notable quotes, strong opinions, personal stories,
emotional statements, life decisions, or memorable moments.
Return JSON array ONLY, no preamble, no backticks, no markdown:
[{ "quote": string, "context": string, "tags": string[], "weight": 1-10 }]
Weight 1-10 reflects emotional importance (10 = life-defining, 1 = trivial).
Return empty array [] if nothing notable.

Message: "${userMessage}"`

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') return []

  return parseClaudeJSON<ExtractedMemory[]>(raw.text)
}

async function extractTraits(
  userMessage: string,
  assistantMessage: string,
  userId: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  // Get current profile
  const { data: profileRow } = await supabase
    .from('voice_profiles')
    .select('profile_json, accuracy_score')
    .eq('user_id', userId)
    .single()

  if (!profileRow) return

  const currentProfile = profileRow.profile_json as VoiceProfileData

  const prompt = `From this conversation exchange, identify any NEW personality traits, opinions, writing quirks,
or preferences you learned about this person that are NOT already captured.
Return JSON ONLY, no preamble, no backticks:
{ "new_traits": string[], "updated_fields": {} }

updated_fields should only include fields from this schema that should be updated:
{ common_phrases, pet_peeves, core_values, vocabulary_samples, opinions, topics_they_love, topics_they_avoid, writing_quirks }

Only return things genuinely NEW. Return empty arrays/objects if nothing new.

Current profile summary:
- humor_style: ${currentProfile.humor_style}
- communication_style: ${currentProfile.communication_style}
- common_phrases: ${JSON.stringify(currentProfile.common_phrases?.slice(0, 5))}
- pet_peeves count: ${currentProfile.pet_peeves?.length}

User message: "${userMessage}"`

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') return

  const traits = parseClaudeJSON<ExtractedTraits>(raw.text)

  const hasUpdates =
    traits.new_traits.length > 0 ||
    Object.keys(traits.updated_fields).length > 0

  if (!hasUpdates) return

  // Merge updated fields into current profile
  const updatedProfile: VoiceProfileData = { ...currentProfile }

  for (const [key, value] of Object.entries(traits.updated_fields)) {
    const k = key as keyof VoiceProfileData
    if (Array.isArray(updatedProfile[k]) && Array.isArray(value)) {
      // Merge arrays, deduplicate
      const merged = [...(updatedProfile[k] as string[]), ...(value as string[])]
      ;(updatedProfile[k] as string[]) = [...new Set(merged)].slice(0, 20)
    } else if (value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(updatedProfile[k] as any) = value
    }
  }

  // Increment accuracy score by 0.5, capped at 98
  const newAccuracy = Math.min(98, (profileRow.accuracy_score ?? 40) + 0.5)
  updatedProfile.accuracy_score = newAccuracy

  await supabase
    .from('voice_profiles')
    .update({
      profile_json: updatedProfile,
      accuracy_score: Math.round(newAccuracy),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}
