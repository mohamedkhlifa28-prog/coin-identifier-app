/**
 * POST /api/voice/clone
 * Sends a voice sample to ElevenLabs to create a cloned voice.
 * Platinum only. Stores the voice_id in voice_clones table.
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
      .select('name, plan')
      .eq('id', user.id)
      .single()

    if (userData?.plan !== 'platinum') {
      return NextResponse.json(
        { error: 'Voice cloning requires a Platinum plan.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    // Forward to ElevenLabs voice cloning API
    const elFormData = new FormData()
    elFormData.append('name', `${userData.name ?? 'Mirror'} Voice`)
    elFormData.append('files', audioFile)
    elFormData.append('description', 'Mirror voice clone')

    const elRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
      body: elFormData,
    })

    if (!elRes.ok) {
      const err = await elRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.detail?.message ?? 'ElevenLabs error' },
        { status: 500 }
      )
    }

    const { voice_id } = (await elRes.json()) as { voice_id: string }

    // Save (or replace) the voice clone record
    await supabase.from('voice_clones').upsert(
      { user_id: user.id, elevenlabs_voice_id: voice_id },
      { onConflict: 'user_id' }
    )

    return NextResponse.json({ success: true, voice_id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
