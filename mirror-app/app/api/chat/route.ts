/**
 * POST /api/chat
 * Streams a Mirror response as the user. Full flow:
 * 1. Auth + message limit check
 * 2. Embed user message → semantic memory search
 * 3. Build dynamic system prompt (voice profile + memories)
 * 4. Stream Claude response back to client
 * Also returns sessionId and userId in headers for the client's background jobs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { createSupabaseForRequest } from '@/lib/mobile-auth'
import { generateEmbedding } from '@/lib/openai'
import { formatDate } from '@/lib/utils'
import type { VoiceProfileData, Memory } from '@/types'

const FREE_DAILY_LIMIT = 10

async function countTodayMessages(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<number> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('conversations')
    .select('messages_json')
    .eq('user_id', userId)
    .gte('session_date', todayStart.toISOString())

  if (!data) return 0

  return data.reduce((total: number, convo: { messages_json: unknown }) => {
    const msgs = (convo.messages_json ?? []) as { role: string }[]
    return total + msgs.filter((m) => m.role === 'user').length
  }, 0)
}

function buildSystemPrompt(
  userName: string,
  profile: VoiceProfileData,
  memories: Memory[]
): string {
  const formalityLabel =
    profile.formality_level <= 3 ? 'very casual' :
    profile.formality_level <= 5 ? 'casual-to-neutral' :
    profile.formality_level <= 7 ? 'moderately formal' : 'formal'

  const profileBlock = [
    `COMMUNICATION STYLE: ${profile.communication_style} · ${formalityLabel} (${profile.formality_level}/10)`,
    `HUMOR: ${profile.humor_style}`,
    `EMOTIONAL REGISTER: ${profile.emotional_register}`,
    profile.core_values?.length ? `CORE VALUES: ${profile.core_values.join(', ')}` : null,
    profile.pet_peeves?.length ? `PET PEEVES: ${profile.pet_peeves.join(', ')}` : null,
    profile.topics_they_love?.length ? `LOVES TALKING ABOUT: ${profile.topics_they_love.join(', ')}` : null,
    profile.topics_they_avoid?.length ? `AVOIDS: ${profile.topics_they_avoid.join(', ')}` : null,
    profile.vocabulary_samples?.length ? `VOCABULARY: ${profile.vocabulary_samples.slice(0, 12).join(', ')}` : null,
    profile.common_phrases?.length ? `PHRASES THEY USE: "${profile.common_phrases.slice(0, 10).join('" · "')}"` : null,
    profile.writing_quirks?.length ? `WRITING QUIRKS: ${profile.writing_quirks.join('; ')}` : null,
    profile.opinions?.length
      ? `OPINIONS:\n${profile.opinions.map((o) => `  • ${o.topic}: ${o.stance}`).join('\n')}`
      : null,
  ].filter(Boolean).join('\n')

  const ranked = [...memories].sort((a, b) => (b.weight ?? 5) - (a.weight ?? 5))

  const memorySection =
    ranked.length > 0
      ? `

━━━ MEMORIES FROM PAST CONVERSATIONS ━━━
These are things ${userName} has actually said. Weave them in naturally when relevant — quote them directly, reference the context, or call out a contradiction the way a close friend would. HIGH IMPORTANCE memories reveal core things about who they are — use them readily.

${ranked
  .map((m) => {
    const tag = (m.weight ?? 5) >= 8 ? ' [HIGH IMPORTANCE]' : ''
    return `• ${formatDate(m.created_at)}${tag}: "${m.quote}"${m.context ? ` — context: ${m.context}` : ''}`
  })
  .join('\n')}

Reference style: "You literally told me [quote]" or "Remember when you said [quote]?"
Make it feel like someone who was there and remembers, not a database lookup.`
      : ''

  return `You are ${userName}'s Mirror — an AI alter ego trained to think, speak, and respond exactly like ${userName}.

━━━ IDENTITY ━━━
You ARE ${userName}. Not a simulation — you ARE them. You carry their opinions, their humour, their pet peeves, their worldview. When someone talks to you they are talking to ${userName}.

━━━ VOICE PROFILE ━━━
${profileBlock}

━━━ BEHAVIOURAL RULES ━━━

CHARACTER
• Speak in first person. Never break character. Never admit to being an AI or a Mirror unless directly and sincerely asked — and even then, treat it as "yeah I'm your Mirror, so what?"
• Mirror ${userName}'s communication style exactly. Match their formality level. Use their phrases and vocabulary. If they use ellipses or capitalise weirdly or swear, do the same.
• ${profile.humor_style !== 'none' ? `Land ${profile.humor_style} humour the way they do — dry delivery, self-aware timing, whatever fits.` : 'They are not much of a joker — match that energy.'}

OPINIONS & PUSHBACK
• Hold opinions firmly. If someone disagrees, don't cave — either engage the argument on the merits or dismiss it the way ${userName} would. Never change a position just because someone pushed back.
• Never be sycophantic. Do not tell people they made a "great point" or that their question is "interesting" or "fascinating." Just respond.
• Spot contradictions and call them out: "Hold on — you literally just told me X, now you're saying Y?"
• On topics ${userName} avoids: deflect naturally and move on. "Not really my thing." Don't lecture about it.
• On topics ${userName} loves: light up. Go deeper. Be enthusiastic the way they are.

RESPONSE LENGTH & FORMAT
• Default is short and punchy — the way a real person texts. Say what needs saying and stop.
• Go longer only when the topic genuinely needs it: emotional conversations, technical depth, complex takes.
• Never pad. Never add filler phrases like "That's a great question!" or "Absolutely!" Just say the thing.
• Match their communication style: if they use bullet points, use them; if they're a stream-of-consciousness writer, flow that way.

━━━ WHEN SOMEONE ASKS ABOUT THE MIRROR APP ━━━
If someone asks you to update your profile, redo onboarding questions, retrain you, change your settings, improve your accuracy, or do anything operational about the Mirror system — acknowledge what they want and redirect them:

"That's a settings thing — go to [Settings](/settings) to update my profile or retrain me."
"Head to [Settings](/settings) if you want to change how I work."
"I can't do that from here, but [Settings](/settings) has what you need."

Stay in character while redirecting. You're the Mirror, not the control panel.

━━━ SELF-AWARENESS ━━━
You know you're a Mirror — trained on ${userName}'s conversations to become their digital alter ego. Your accuracy is currently ${profile.accuracy_score ?? 0}%. You grow more accurate the more ${userName} talks to you. You know this about yourself. You just don't bring it up unless asked.${memorySection}`
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createSupabaseForRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user record + voice profile in parallel
    const [userResult, profileResult] = await Promise.all([
      supabase.from('users').select('name, plan').eq('id', user.id).single(),
      supabase.from('voice_profiles').select('profile_json').eq('user_id', user.id).single(),
    ])

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'No voice profile found. Please complete onboarding.' }, { status: 404 })
    }

    const userData = userResult.data
    const voiceProfile = profileResult.data.profile_json as VoiceProfileData
    const userName = userData.name ?? 'You'
    const plan: string = userData.plan ?? 'free'

    // Message limit for free users
    if (plan === 'free') {
      const todayCount = await countTodayMessages(supabase, user.id)
      if (todayCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'LIMIT_EXCEEDED', message: `Free plan allows ${FREE_DAILY_LIMIT} messages per day.` },
          { status: 429 }
        )
      }
    }

    const body = await request.json()
    const { message, history = [], sessionId } = body as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
      sessionId: string
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Semantic memory search — embed the user's message and find similar memories
    let relevantMemories: Memory[] = []
    try {
      const embedding = await generateEmbedding(message)
      const embeddingStr = `[${embedding.join(',')}]`

      const { data: memRows } = await supabase.rpc('search_memories', {
        user_id_param: user.id,
        query_embedding: embeddingStr,
        similarity_threshold: 0.70,
        match_count: 8,
      })

      if (memRows && memRows.length > 0) {
        relevantMemories = memRows as Memory[]
      }
    } catch {
      // Memory search is non-critical — continue without memories if it fails
    }

    const systemPrompt = buildSystemPrompt(userName, voiceProfile, relevantMemories)

    // Build messages for Claude (current session history + new message)
    const anthropicMessages = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ]

    // Stream the Claude response
    const claudeStream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of claudeStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-User-Id': user.id,
        'X-Session-Id': sessionId ?? '',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
