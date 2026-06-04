/**
 * POST /api/generate
 * Content Generator — writes tweets, emails, speeches, texts in the user's voice.
 * Pro + Platinum only. Streams the Claude response.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import type { VoiceProfileData } from '@/types'

type GenerateMode = 'tweet' | 'email' | 'speech' | 'text' | 'anything'

const MODE_INSTRUCTIONS: Record<GenerateMode, string> = {
  tweet: 'Write a tweet/social media post (max 280 characters). No hashtags unless they specifically asked for them.',
  email: 'Write an email reply. Keep it in their exact tone — not over-formal, not sloppy. Match their natural professional voice.',
  speech: 'Write the speech or toast. Use natural spoken language, not written essay style. Keep it heartfelt and authentic.',
  text: 'Write a text message reply. Keep it casual, short, real. Exactly how they would text.',
  anything: 'Write exactly what was requested.',
}

function toneDescription(level: number): string {
  if (level <= 3) return 'Very casual — like a text to a close friend. Use their exact informal language.'
  if (level <= 5) return 'Natural and conversational. Their normal voice.'
  if (level <= 7) return 'Polished but still clearly them. Not stiff.'
  return 'Professional and formal, but still identifiably their voice.'
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
          setAll: (cs) =>
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('name, plan')
      .eq('id', user.id)
      .single()

    if (!userData || userData.plan === 'free') {
      return NextResponse.json(
        { error: 'PLAN_REQUIRED', message: 'Content Generator requires a Pro or Platinum plan.' },
        { status: 403 }
      )
    }

    const { data: profileData } = await supabase
      .from('voice_profiles')
      .select('profile_json')
      .eq('user_id', user.id)
      .single()

    const voiceProfile = profileData?.profile_json as VoiceProfileData | undefined

    const { prompt: userPrompt, mode, tone = 5 } = await request.json() as {
      prompt: string
      mode: GenerateMode
      tone?: number
    }

    if (!userPrompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const systemPrompt = `You are a ghostwriter who writes EXACTLY as ${userData.name ?? 'this person'} writes — using their precise vocabulary, humor, rhythm, and voice.

${voiceProfile ? `Their voice profile:
- Humor style: ${voiceProfile.humor_style}
- Communication style: ${voiceProfile.communication_style}
- Emotional register: ${voiceProfile.emotional_register}
- Common phrases: ${voiceProfile.common_phrases?.slice(0, 5).join(', ')}
- Writing quirks: ${voiceProfile.writing_quirks?.slice(0, 3).join(', ')}` : ''}

TONE: ${toneDescription(tone)}

TASK: ${MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.anything}

Write ONLY the requested content. No preamble, no "here is the...", no commentary after.`

    const claudeStream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of claudeStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
