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

  // Increment view count (best effort)
  supabase
    .from('shared_mirrors')
    .update({ views: supabase.rpc('increment', { x: 1 }) })
    .eq('slug', slug)
    .then(() => {})

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

  const systemPrompt = `You are Mirror — an AI trained to think, speak, and respond exactly like ${ownerName}.
Here is their voice profile:
${JSON.stringify(voiceProfile, null, 2)}

Respond to all messages exactly as ${ownerName} would — use their vocabulary, humor,
communication style, and worldview. Never break character. Never say you are an AI.
Speak in first person as if you ARE them. Keep responses concise and natural.`

  const claudeStream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 512,
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
