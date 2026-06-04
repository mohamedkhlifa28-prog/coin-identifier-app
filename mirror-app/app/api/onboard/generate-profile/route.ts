/**
 * POST /api/onboard/generate-profile
 * Receives all 20 onboarding answers + 3 writing samples, calls Claude to
 * generate an initial voice profile JSON, then saves it to voice_profiles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { parseClaudeJSON } from '@/lib/utils'
import type { VoiceProfileData } from '@/types'

const VOICE_PROFILE_SCHEMA = `{
  "humor_style": "dry" | "self-deprecating" | "absurdist" | "none",
  "formality_level": 1-10,
  "common_phrases": string[],
  "core_values": string[],
  "pet_peeves": string[],
  "communication_style": "direct" | "storytelling" | "bullet-points" | "stream-of-consciousness",
  "vocabulary_samples": string[],
  "opinions": [{ "topic": string, "stance": string }],
  "emotional_register": "warm" | "cold" | "analytical" | "empathetic",
  "topics_they_love": string[],
  "topics_they_avoid": string[],
  "writing_quirks": string[],
  "accuracy_score": 40
}`

const QUESTIONS = [
  "What's your biggest pet peeve in other people?",
  "What do you value most: loyalty, intelligence, ambition, or kindness?",
  "How do you usually handle conflict — avoid it, confront it, or deflect with humor?",
  "What's your honest opinion on social media?",
  "Are you more driven by logic or gut feeling?",
  "What's something most people do that you think is pointless?",
  "How would your closest friend describe your sense of humor?",
  "What topic can you talk about for hours without getting bored?",
  "What's a belief you hold that most people would disagree with?",
  "When you're stressed, what's your default reaction?",
  "Do you tend to overshare or undershare with people you just met?",
  "What's something you secretly judge people for?",
  "Are you someone who makes decisions fast or deliberates forever?",
  "What's your relationship with money — stress, tool, game, or ignore?",
  "How do you feel about small talk?",
  "What's the most important quality in a friendship?",
  "Do you tend to be early, on time, or always late?",
  "What's a topic you refuse to debate because you know you're right?",
  "How do you feel when someone gives you unsolicited advice?",
  "What do you want people to remember you for?",
]

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { answers, writingSamples } = body as {
      answers: string[]
      writingSamples: string[]
    }

    if (!answers || answers.length !== 20) {
      return NextResponse.json({ error: 'Exactly 20 answers required' }, { status: 400 })
    }
    if (!writingSamples || writingSamples.length !== 3) {
      return NextResponse.json({ error: 'Exactly 3 writing samples required' }, { status: 400 })
    }

    // Format Q&A pairs for Claude
    const qaPairs = QUESTIONS.map((q, i) => `Q: ${q}\nA: ${answers[i] ?? ''}`).join('\n\n')

    const prompt = `Based on these answers and writing samples, generate a detailed voice profile JSON for this person.
Return JSON ONLY, no preamble, no backticks, no markdown.

Use this exact schema: ${VOICE_PROFILE_SCHEMA}

Make it highly specific — use their actual words and phrases from the samples. Extract real vocabulary patterns, speech quirks, recurring words, and authentic personality signals. Not generic. Not vague.

--- PERSONALITY QUESTIONS ---
${qaPairs}

--- WRITING SAMPLE 1 (casual / friend) ---
${writingSamples[0]}

--- WRITING SAMPLE 2 (formal / professional) ---
${writingSamples[1]}

--- WRITING SAMPLE 3 (personal / raw) ---
${writingSamples[2]}`

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from Claude' }, { status: 500 })
    }

    const profileData = parseClaudeJSON<VoiceProfileData>(rawContent.text)
    profileData.accuracy_score = 40

    // Save voice profile — check if one exists first, then insert or update
    const { data: existing } = await supabase
      .from('voice_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let dbError
    if (existing) {
      ;({ error: dbError } = await supabase
        .from('voice_profiles')
        .update({
          profile_json: profileData,
          accuracy_score: 40,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id))
    } else {
      ;({ error: dbError } = await supabase.from('voice_profiles').insert({
        user_id: user.id,
        profile_json: profileData,
        accuracy_score: 40,
        version: 1,
        total_sessions: 0,
        updated_at: new Date().toISOString(),
      }))
    }

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
