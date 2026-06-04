'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { UpgradeModal } from './UpgradeModal'
import type { Plan } from '@/types'

type Mode = 'tweet' | 'email' | 'speech' | 'text' | 'anything'

const MODES: { key: Mode; label: string; placeholder: string }[] = [
  { key: 'tweet', label: 'Tweet / Post', placeholder: 'Write a tweet about my opinion on remote work…' },
  { key: 'email', label: 'Email Reply', placeholder: 'Paste the email you received and what you want to say back…' },
  { key: 'speech', label: 'Speech / Toast', placeholder: 'Write a 2-minute wedding toast for my friend Jake…' },
  { key: 'text', label: 'Text Message', placeholder: 'How would I reply to: "Hey, are you free this weekend?"' },
  { key: 'anything', label: 'Anything', placeholder: 'Write a LinkedIn post about getting promoted. Make it sound like me, not corporate.' },
]

interface GenerateClientProps {
  plan: Plan
  userName: string
}

export function GenerateClient({ plan, userName }: GenerateClientProps) {
  const [mode, setMode] = useState<Mode>('tweet')
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState(5)
  const [output, setOutput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  const isPro = plan === 'pro' || plan === 'platinum'

  async function generate() {
    if (!isPro) { setShowUpgrade(true); return }
    if (!prompt.trim() || generating) return

    setOutput('')
    setError(null)
    setGenerating(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode, tone }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'PLAN_REQUIRED') { setShowUpgrade(true); return }
        throw new Error(data.message ?? data.error ?? 'Generation failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setOutput(full)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function copyOutput() {
    if (!output) return
    await navigator.clipboard.writeText(output)
  }

  const toneLabel =
    tone <= 3 ? 'Very casual' : tone <= 5 ? 'Natural' : tone <= 7 ? 'Polished' : 'Formal'

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] px-6 py-4 flex items-center gap-4">
        <Link href="/chat" className="text-[#555] hover:text-[#888] text-sm transition-colors">
          ← Chat
        </Link>
        <h1 className="text-lg font-light text-[#f0f0f0]">Content Generator</h1>
        {!isPro && (
          <span className="text-xs text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded-full px-2 py-0.5">
            Pro
          </span>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Mode tabs */}
        <div className="flex flex-wrap gap-2">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                mode === key
                  ? 'bg-[#a78bfa] text-white'
                  : 'bg-[#111111] border border-[#1f1f1f] text-[#888888] hover:text-[#f0f0f0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Prompt */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#555] block mb-2">
            What do you want written?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={MODES.find((m) => m.key === mode)?.placeholder}
            rows={5}
            className="w-full bg-[#111111] border border-[#1f1f1f] focus:border-[#a78bfa]/40 rounded-xl px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#444] outline-none transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Tone slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-widest text-[#555]">Tone</label>
            <span className="text-xs text-[#a78bfa]">{toneLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#555]">Casual</span>
            <input
              type="range"
              min={1}
              max={10}
              value={tone}
              onChange={(e) => setTone(Number(e.target.value))}
              className="flex-1 accent-[#a78bfa] h-1 cursor-pointer"
            />
            <span className="text-xs text-[#555]">Formal</span>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={generating || !prompt.trim()}
          className="w-full bg-[#a78bfa] hover:bg-[#9370f5] disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-colors"
        >
          {generating
            ? 'Writing…'
            : isPro
              ? `Write as ${userName}`
              : 'Upgrade to Generate'}
        </button>

        {error && (
          <p className="text-sm text-[#f87171] text-center">{error}</p>
        )}

        {/* Output */}
        {output && (
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5 animate-fade-in">
            <div ref={outputRef} className="text-sm text-[#f0f0f0] leading-relaxed whitespace-pre-wrap mb-4">
              {output}
              {generating && (
                <span className="inline-block w-0.5 h-4 bg-[#a78bfa] animate-pulse-accent ml-0.5 align-middle" />
              )}
            </div>
            {!generating && (
              <div className="flex gap-3 border-t border-[#1f1f1f] pt-4">
                <button
                  onClick={copyOutput}
                  className="text-xs text-[#888888] hover:text-[#f0f0f0] transition-colors flex items-center gap-1.5"
                >
                  ⎘ Copy
                </button>
                <button
                  onClick={generate}
                  className="text-xs text-[#888888] hover:text-[#f0f0f0] transition-colors"
                >
                  ↺ Regenerate
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal
          reason="Content Generator is available on Pro and Platinum plans."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  )
}
