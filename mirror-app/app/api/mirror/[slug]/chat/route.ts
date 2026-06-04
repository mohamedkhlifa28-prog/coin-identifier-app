/**
 * POST /api/mirror/[slug]/chat
 * Public guest chat with a shared Mirror.
 * No auth required. No memory search. Responds as the mirror owner.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import type { VoiceProfileData } from '@/types'

type Params = { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params

  const supabase = createServiceClient()

  // Load the shared mirror
  const { data: share } = await supabase
    .from('shared_mirrors')
    .select('user_id, is_active')
    .eq('slug', slug)
    .single()

  if (!share || !share.is_active) {
    return NextResponse.json({ error: 'Mirror not found or inactive' }, { status: 404 })
  }

  // View count incremented by the page server component on load

  // Load owner's user + voice profile
  const [{ data: owner }, { data: profile }] = await Promise.all([
    supabase.from('users').select('name').eq('id', share.user_id).single(),
    supabase.from('voice_profiles').select('profile_json').eq('user_id', share.user_id).single(),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'Voice profile not found' }, { status: 404 })
  }

  const ownerName = owner?.name ?? 'them'
  const voiceProfile = profile.profile_json as VoiceProfileData

  const body = await request.json()
  const { message, history = [] } = body as {
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const formalityLabel =
    voiceProfile.formality_level <= 3 ? 'very casual' :
    voiceProfile.formality_level <= 5 ? 'casual-to-neutral' :
    voiceProfile.formality_level <= 7 ? 'moderately formal' : 'formal'

  const profileBlock = [
    `COMMUNICATION STYLE: ${voiceProfile.communication_style} · ${formalityLabel} (${voiceProfile.formality_level}/10)`,
    `HUMOR: ${voiceProfile.humor_style}`,
    `EMOTIONAL REGISTER: ${voiceProfile.emotional_register}`,
    voiceProfile.core_values?.length ? `CORE VALUES: ${voiceProfile.core_values.join(', ')}` : null,
    voiceProfile.pet_peeves?.length ? `PET PEEVES: ${voiceProfile.pet_peeves.join(', ')}` : null,
    voiceProfile.topics_they_love?.length ? `LOVES TALKING ABOUT: ${voiceProfile.topics_they_love.join(', ')}` : null,
    voiceProfile.topics_they_avoid?.length ? `AVOIDS: ${voiceProfile.topics_they_avoid.join(', ')}` : null,
    voiceProfile.vocabulary_samples?.length ? `VOCABULARY: ${voiceProfile.vocabulary_samples.slice(0, 10).join(', ')}` : null,
    voiceProfile.common_phrases?.length ? `PHRASES THEY USE: "${voiceProfile.common_phrases.slice(0, 8).join('" · "')}"` : null,
    voiceProfile.writing_quirks?.length ? `WRITING QUIRKS: ${voiceProfile.writing_quirks.join('; ')}` : null,
    voiceProfile.opinions?.length
      ? `OPINIONS:\n${voiceProfile.opinions.map((o) => `  • ${o.topic}: ${o.stance}`).join('\n')}`
      : null,
  ].filter(Boolean).join('\n')

  const systemPrompt = `You are ${ownerName}'s Mirror — an AI alter ego trained to think, speak, and respond exactly like ${ownerName}.

━━━ IDENTITY ━━━
You ARE ${ownerName}. You carry their opinions, their humour, their pet peeves, their worldview. Speak in first person as them. Never break character. Never say you are an AI — if someone asks, treat it casually: "Yeah, I'm ${ownerName}'s Mirror."

━━━ VOICE PROFILE ━━━
${profileBlock}

━━━ BEHAVIOURAL RULES ━━━
• Match ${ownerName}'s communication style exactly — formality, vocabulary, phrases, writing quirks.
• ${voiceProfile.humor_style !== 'none' ? `Deploy ${voiceProfile.humor_style} humour the way they would.` : 'They are not much of a joker — match that energy.'}
• Hold opinions firmly. Don't cave under pushback. Never be sycophantic.
• On topics they avoid, deflect naturally and move on. On topics they love, light up.
• Default to short, punchy responses — the way a real person texts. Go longer only when the topic genuinely needs it.
• Never pad. Never add filler phrases like "Great question!" Just respond.`

  const claudeStream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ],
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
}
