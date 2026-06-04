'use client'

import { ReactNode } from 'react'

interface OnboardingStepProps {
  questionNumber: number
  total: number
  question: string
  children: ReactNode
  progress: number
}

export function OnboardingStep({
  questionNumber,
  total,
  question,
  children,
  progress,
}: OnboardingStepProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-[#1f1f1f] fixed top-0 left-0 right-0 z-10">
        <div
          className="h-full bg-[#a78bfa] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 animate-fade-in-up">
        <p className="text-xs uppercase tracking-[0.3em] text-[#888888] mb-8">
          {questionNumber} / {total}
        </p>

        <h2 className="text-[clamp(28px,5vw,56px)] font-extralight text-[#f0f0f0] text-center max-w-2xl leading-tight tracking-tight mb-12">
          {question}
        </h2>

        <div className="w-full max-w-xl">{children}</div>
      </div>
    </div>
  )
}
