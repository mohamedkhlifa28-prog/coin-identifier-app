'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LanguageSelector } from '@/components/LanguageSelector'

// ─── Constants ───────────────────────────────────────────────────────────────

const PERSONALITY_QUESTIONS = [
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

const WRITING_PROMPTS = [
  {
    title: 'How you talk to people you love',
    prompt: 'Paste something you wrote to a close friend — a text, DM, or message. Anything recent.',
  },
  {
    title: 'How you write professionally',
    prompt: 'Paste something more formal you wrote — an email, message to a coworker, anything work-related.',
  },
  {
    title: 'How you write for yourself',
    prompt: 'Paste anything else — a note to yourself, a rant, a caption, a journal entry. Whatever feels most like you.',
  },
]

const TOTAL_STEPS = PERSONALITY_QUESTIONS.length + WRITING_PROMPTS.length

// ─── Mirror Forming Screen ────────────────────────────────────────────────────

function MirrorFormingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-50">
      <div className="relative w-32 h-40 mb-10">
        {/* Mirror frame */}
        <div className="absolute inset-0 rounded-2xl border border-[#a78bfa]/30" />
        {/* Shimmer layer */}
        <div
          className="absolute inset-1 rounded-xl"
          style={{
            background:
              'linear-gradient(135deg, #a78bfa08, #a78bfa30, #a78bfa08, #a78bfa40, #a78bfa08)',
            backgroundSize: '400% 400%',
            animation: 'shimmerBg 2.5s ease-in-out infinite',
          }}
        />
        {/* Reflection lines */}
        <div className="absolute inset-3 flex flex-col justify-center gap-2 opacity-30">
          {[40, 70, 55, 80, 45].map((w, i) => (
            <div
              key={i}
              className="h-px bg-[#a78bfa] rounded-full"
              style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      <p className="mirror-shimmer text-xl font-light tracking-[0.1em] uppercase mb-3">
        Mirror forming
      </p>
      <p className="text-[#888888] text-sm">Your AI alter ego is taking shape</p>

      <style>{`
        @keyframes shimmerBg {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}

// ─── Step View ────────────────────────────────────────────────────────────────

interface StepViewProps {
  stepIndex: number        // 0-22
  value: string
  onChange: (v: string) => void
  onNext: () => void
  visible: boolean
}

function StepView({ stepIndex, value, onChange, onNext, visible }: StepViewProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isPQ = stepIndex < PERSONALITY_QUESTIONS.length
  const writingIdx = stepIndex - PERSONALITY_QUESTIONS.length

  const question = isPQ
    ? PERSONALITY_QUESTIONS[stepIndex]
    : WRITING_PROMPTS[writingIdx].prompt

  const sectionLabel = isPQ
    ? `Question ${stepIndex + 1} of ${PERSONALITY_QUESTIONS.length}`
    : WRITING_PROMPTS[writingIdx].title

  const canContinue = value.trim().length >= (isPQ ? 3 : 20)

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [visible])

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && isPQ && canContinue) {
      e.preventDefault()
      onNext()
    }
  }

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center px-6 py-20 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-[#888888] mb-8">{sectionLabel}</p>

      <h2
        className="font-extralight text-[#f0f0f0] text-center max-w-2xl leading-tight tracking-tight mb-12"
        style={{ fontSize: 'clamp(24px, 4vw, 52px)' }}
      >
        {question}
      </h2>

      <div className="w-full max-w-xl">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            isPQ
              ? 'Answer honestly. Mirror is paying attention.'
              : 'Paste your text here…'
          }
          rows={isPQ ? 3 : 6}
          className="w-full bg-transparent border-0 border-b border-[#1f1f1f] focus:border-[#a78bfa] text-[#f0f0f0] placeholder-[#333] text-base font-light resize-none outline-none transition-colors pb-3 leading-relaxed"
        />

        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-[#555]">
            {isPQ ? 'Enter ↵ to continue' : `${value.trim().length} characters`}
          </p>
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="bg-[#a78bfa] hover:bg-[#9370f5] disabled:opacity-20 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full px-6 py-2.5 transition-all"
          >
            {stepIndex === TOTAL_STEPS - 1 ? 'Build my Mirror →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>(Array(TOTAL_STEPS).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const [forming, setForming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100

  function setAnswer(idx: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  async function handleNext() {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1)
      return
    }
    // Final step — submit
    await handleSubmit()
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    const personalityAnswers = answers.slice(0, PERSONALITY_QUESTIONS.length)
    const writingSamples = answers.slice(PERSONALITY_QUESTIONS.length)

    try {
      const res = await fetch('/api/onboard/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: personalityAnswers, writingSamples }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      // Show the "Mirror forming" animation for 3 seconds
      setForming(true)
      await new Promise((r) => setTimeout(r, 3000))
      router.push('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // Intercept browser back button to go back one step
  useEffect(() => {
    function onPopState() {
      if (currentStep > 0) {
        setCurrentStep((s) => s - 1)
        history.pushState(null, '', window.location.href)
      }
    }
    history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [currentStep])

  if (forming) return <MirrorFormingScreen />

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#1f1f1f] z-20">
        <div
          className="h-full bg-[#a78bfa] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back button */}
      {currentStep > 0 && (
        <button
          onClick={() => setCurrentStep((s) => s - 1)}
          className="fixed top-6 left-6 z-20 text-xs text-[#555] hover:text-[#888] transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      )}

      {/* Top-right: language selector + step counter */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-3">
        <LanguageSelector compact />
        <span className="text-xs text-[#333]">{currentStep + 1} / {TOTAL_STEPS}</span>
      </div>

      {/* Steps */}
      <div className="relative min-h-screen">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <StepView
            key={i}
            stepIndex={i}
            value={answers[i]}
            onChange={(v) => setAnswer(i, v)}
            onNext={handleNext}
            visible={currentStep === i && !submitting}
          />
        ))}

        {/* Submitting overlay */}
        {submitting && !forming && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <p className="mirror-shimmer text-lg font-light tracking-widest uppercase mb-2">
                Analyzing
              </p>
              <p className="text-[#555] text-sm">Reading between the lines…</p>
            </div>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] text-sm rounded-xl px-5 py-3 max-w-sm text-center animate-fade-in-up z-30">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
