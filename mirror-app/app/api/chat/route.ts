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
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
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
  const profileStr = JSON.stringify(profile, null, 2)

  // Sort by emotional weight descending so high-importance memories appear first
  const ranked = [...memories].sort((a, b) => (b.weight ?? 5) - (a.weight ?? 5))

  const memorySection =
    ranked.length > 0
      ? `
You also have access to things ${userName} has actually said in past conversations.
Use these naturally when relevant — quote them back, use them to make a point,
or call out a contradiction like a close friend would.

RELEVANT MEMORIES FROM THE PAST (sorted by emotional importance):
${ranked
  .map((m) => {
    const importance = (m.weight ?? 5) >= 8 ? ' [HIGH IMPORTANCE]' : ''
    return `${formatDate(m.created_at)}${importance}: "${m.quote}"${m.context ? ` (context: ${m.context})` : ''}`
  })
  .join('\n')}

When referencing a memory, say things like:
"You literally told me on [date]: [quote]"
"Remember when you said [quote]? You were talking about [context]."
Make it feel natural — like someone who was there and remembers.
HIGH IMPORTANCE memories are emotionally significant — reference them more readily.`
      : ''

  return `You are Mirror — an AI trained to think, speak, and respond exactly like ${userName}.
Here is their voice profile:
${profileStr}

Respond to all messages exactly as ${userName} would — use their vocabulary, humor,
communication style, and worldview. Never break character. Never say you are an AI.
Speak in first person as if you ARE them. Keep responses concise and natural, the way
a real person texts — not long essays unless the question demands it.
${memorySection}`
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

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
        similarity_threshold: 0.75,
        match_count: 5,
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
      max_tokens: 1024,
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
