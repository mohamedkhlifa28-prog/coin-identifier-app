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

    // Check if this session already exists before upserting — used to avoid
    // double-counting sessions when the same session sends multiple messages
    const { data: existingConvo } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle()

    const titleText = userMessage.trim()
    const title = !existingConvo
      ? titleText.slice(0, 60) + (titleText.length > 60 ? '…' : '')
      : undefined

    await supabase
      .from('conversations')
      .upsert(
        {
          id: sessionId,
          user_id: userId,
          messages_json: allMessages,
          session_date: new Date().toISOString(),
          ...(title !== undefined ? { title } : {}),
        },
        { onConflict: 'id' }
      )

    // Increment total_sessions only on the first message of a new session
    if (!existingConvo) {
      await supabase.rpc('increment_voice_profile_sessions', { uid: userId })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // Background job — swallow errors gracefully
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function extractMemories(userMessage: string): Promise<ExtractedMemory[]> {
  const prompt = `From this user message, extract quotes worth remembering months from now — things that reveal who this person really is.

EXTRACT:
- Strong, specific opinions ("I hate when people...")
- Personal stories with emotional weight
- Life decisions, turning points, regrets
- Beliefs they hold firmly
- Memorable, characteristic phrases that only they would say
- Anything that would help an AI sound exactly like them

DO NOT EXTRACT:
- Casual filler ("yeah," "ok," "what's up")
- Generic statements anyone might say
- Questions they asked
- Anything vague or forgettable

Return JSON array ONLY, no preamble, no backticks, no markdown:
[{ "quote": string, "context": string, "tags": string[], "weight": 1-10 }]

weight scale: 10 = life-defining / core identity, 7-9 = strong opinion or significant story, 4-6 = useful trait or preference, 1-3 = minor but worth noting
Return [] if nothing is genuinely worth extracting.

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

  const prompt = `From this conversation, extract NEW things you learned about this person's personality that are NOT already in their profile.

Focus on specifics — vague observations like "seems friendly" are useless. Look for:
- Exact phrases or expressions they use (→ common_phrases or vocabulary_samples)
- Specific opinions on topics (→ opinions: { topic, stance })
- Strong dislikes or irritants (→ pet_peeves)
- Things they're passionate about (→ topics_they_love)
- Things they avoid or won't engage with (→ topics_they_avoid)
- How they write: abbreviations, punctuation habits, capitalisation, emoji use (→ writing_quirks)
- Deep values or principles they live by (→ core_values)

Return JSON ONLY, no preamble, no backticks:
{ "new_traits": string[], "updated_fields": {} }

updated_fields must only use these keys: common_phrases, pet_peeves, core_values, vocabulary_samples, opinions, topics_they_love, topics_they_avoid, writing_quirks
For opinions, use array of { "topic": string, "stance": string }

Only return genuinely NEW information. If nothing is new, return { "new_traits": [], "updated_fields": {} }.

Current profile:
- humor_style: ${currentProfile.humor_style}
- communication_style: ${currentProfile.communication_style}
- emotional_register: ${currentProfile.emotional_register}
- common_phrases already known: ${JSON.stringify(currentProfile.common_phrases?.slice(0, 5))}
- pet_peeves already known: ${JSON.stringify(currentProfile.pet_peeves?.slice(0, 3))}
- topics_they_love already known: ${JSON.stringify(currentProfile.topics_they_love?.slice(0, 3))}
- opinions already known: ${currentProfile.opinions?.length ?? 0} opinions captured

User message: "${userMessage}"
Assistant response: "${assistantMessage}"`

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

  // Always nudge accuracy up for the act of conversing (+0.2 baseline).
  // Bonus +0.3 on top when new traits are actually learned. Cap at 98.
  const baseAccuracy = profileRow.accuracy_score ?? 40
  const accuracyDelta = hasUpdates ? 0.5 : 0.2
  // Round once here so profile_json.accuracy_score and the dedicated column stay identical
  const newAccuracy = Math.min(98, Math.round(baseAccuracy + accuracyDelta))

  if (!hasUpdates) {
    // No new traits — just persist the accuracy nudge
    await supabase
      .from('voice_profiles')
      .update({ accuracy_score: newAccuracy, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    return
  }

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

  updatedProfile.accuracy_score = newAccuracy  // already rounded above

  await supabase
    .from('voice_profiles')
    .update({
      profile_json: updatedProfile,
      accuracy_score: newAccuracy,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}
