/**
 * POST /api/voice/transcribe
 * Transcribes audio using OpenAI Whisper. Used by the mobile app.
 * Accepts multipart/form-data with an "audio" file field.
 * Supports both cookie auth (web) and Bearer token auth (mobile).
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseForRequest } from '@/lib/mobile-auth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const { user } = await createSupabaseForRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const language = (formData.get('language') as string) || undefined

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language?.slice(0, 2),
    })

    return NextResponse.json({ text: transcription.text })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 }
    )
  }
}
