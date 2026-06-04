/**
 * POST /api/voice/speak
 * Converts text to speech using the user's ElevenLabs cloned voice.
 * Platinum only. Returns audio stream.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
      .select('plan')
      .eq('id', user.id)
      .single()

    if (userData?.plan !== 'platinum') {
      return NextResponse.json({ error: 'Voice mode requires Platinum plan.' }, { status: 403 })
    }

    const { data: voiceClone } = await supabase
      .from('voice_clones')
      .select('elevenlabs_voice_id')
      .eq('user_id', user.id)
      .single()

    if (!voiceClone) {
      return NextResponse.json(
        { error: 'No voice clone found. Please record your voice in Settings first.' },
        { status: 404 }
      )
    }

    const { text } = await request.json() as { text: string }
    if (!text?.trim()) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceClone.elevenlabs_voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      }
    )

    if (!elRes.ok) {
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
    }

    const audioBuffer = await elRes.arrayBuffer()
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
