'use client'

import { useEffect, useState } from 'react'

interface MirrorAgeProps {
  ageDays: number
}

const MILESTONES = [7, 30, 90, 365]

export function MirrorAge({ ageDays }: MirrorAgeProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (MILESTONES.includes(ageDays)) {
      setShowCelebration(true)
      const t = setTimeout(() => setShowCelebration(false), 5000)
      return () => clearTimeout(t)
    }
  }, [ageDays])

  return (
    <div className="relative flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
      <span className="text-xs text-[#888888]">
        Mirror is{' '}
        <span className="text-[#f0f0f0] font-medium">{ageDays}</span>{' '}
        {ageDays === 1 ? 'day' : 'days'} old
      </span>

      {showCelebration && (
        <span className="absolute left-full ml-2 text-xs text-[#a78bfa] whitespace-nowrap animate-fade-in-up">
          🎉 Milestone!
        </span>
      )}
    </div>
  )
}
