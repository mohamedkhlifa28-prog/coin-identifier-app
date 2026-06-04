/**
 * GET /api/cron/weekly-report
 * Sends a weekly Mirror report email to each active user.
 * vercel.json schedule: "0 8 * * 1" (every Monday 8am UTC)
 *
 * Email delivery: wire RESEND_API_KEY + FROM_EMAIL env vars to use Resend,
 * or swap the sendEmail function for any transactional email provider.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { parseClaudeJSON } from '@/lib/utils'

interface WeekSummary {
  new_traits: string[]
  vocabulary_observations: string[]
  accuracy_delta: number
}

async function buildWeekSummary(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<WeekSummary | null> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentMemories } = await supabase
    .from('memories')
    .select('quote, tags')
    .eq('user_id', userId)
    .gte('created_at', weekAgo)
    .order('weight', { ascending: false })
    .limit(30)

  if (!recentMemories || recentMemories.length === 0) return null

  const memoryList = recentMemories.map((m) => `- "${m.quote}"`).join('\n')

  const prompt = `From these quotes a person said this past week, identify:
1. 2-3 new personality traits or patterns you noticed
2. 2-3 vocabulary/speech observations (specific words or phrases they use often)
3. How much their Mirror accuracy improved (estimate 1-5%)

Return JSON ONLY, no preamble:
{ "new_traits": string[], "vocabulary_observations": string[], "accuracy_delta": number }

Quotes from this week:
${memoryList}`

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') return null

  return parseClaudeJSON<WeekSummary>(raw.text)
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL ?? 'mirror@yourdomain.com'

  if (!resendKey) {
    console.log(`[Weekly Report] Would send to ${to}: ${subject}`)
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  })
}

function buildEmailHtml(userName: string, summary: WeekSummary, accuracyBefore: number): string {
  const accuracyAfter = Math.min(98, accuracyBefore + summary.accuracy_delta)
  const traits = summary.new_traits.map((t) => `<li>${t}</li>`).join('')
  const vocab = summary.vocabulary_observations.map((v) => `<li>${v}</li>`).join('')

  return `
<div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #f0f0f0; padding: 40px 32px; border-radius: 12px;">
  <h1 style="font-size: 22px; font-weight: 300; letter-spacing: -0.02em; color: #f0f0f0; margin: 0 0 8px;">
    Your Mirror learned a few things this week.
  </h1>
  <p style="color: #888; font-size: 13px; margin: 0 0 32px;">Weekly report for ${userName}</p>

  <div style="background: #111; border: 1px solid #1f1f1f; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
    <p style="color: #a78bfa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">This week you learned…</p>
    <ul style="margin: 0; padding: 0 0 0 16px; color: #f0f0f0; font-size: 14px; line-height: 1.7;">${traits}</ul>
  </div>

  <div style="background: #111; border: 1px solid #1f1f1f; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
    <p style="color: #a78bfa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">Your vocabulary</p>
    <ul style="margin: 0; padding: 0 0 0 16px; color: #f0f0f0; font-size: 14px; line-height: 1.7;">${vocab}</ul>
  </div>

  <div style="background: #111; border: 1px solid #1f1f1f; border-radius: 10px; padding: 20px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #888; font-size: 14px;">Mirror accuracy</span>
    <span style="color: #a78bfa; font-size: 18px; font-weight: 300;">${accuracyBefore}% → ${accuracyAfter.toFixed(0)}%</span>
  </div>

  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/chat"
     style="display: block; text-align: center; background: #a78bfa; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
    Keep training your Mirror →
  </a>

  <p style="color: #333; font-size: 11px; text-align: center; margin-top: 24px;">
    You're receiving this because your Mirror sends you a weekly update.
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings" style="color: #555;">Manage notifications</a>
  </p>
</div>`
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Active users this week
  const { data: activeUsers } = await supabase
    .from('users')
    .select('id, email, name')
    .gte('last_active', weekAgo)
    .limit(500)

  let sent = 0

  for (const u of activeUsers ?? []) {
    try {
      const summary = await buildWeekSummary(supabase, u.id)
      if (!summary) continue

      const { data: profile } = await supabase
        .from('voice_profiles')
        .select('accuracy_score')
        .eq('user_id', u.id)
        .single()

      const accuracyBefore = profile?.accuracy_score ?? 40
      const html = buildEmailHtml(u.name ?? 'there', summary, accuracyBefore)

      await sendEmail(u.email, `Your Mirror learned ${summary.new_traits.length} new things this week`, html)
      sent++
    } catch {
      // Continue with other users
    }
  }

  return NextResponse.json({ sent })
}
