'use client'

import { useEffect, useRef, useState } from 'react'

interface AccuracyBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function AccuracyBadge({ score, size = 'md', showLabel = true }: AccuracyBadgeProps) {
  const [displayed, setDisplayed] = useState(0)
  const prevScore = useRef(0)

  useEffect(() => {
    const start = prevScore.current
    const end = score
    const duration = 800
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
    prevScore.current = end
  }, [score])

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2',
  }

  const color =
    displayed >= 80
      ? '#34d399'
      : displayed >= 60
        ? '#a78bfa'
        : displayed >= 40
          ? '#fbbf24'
          : '#888888'

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono ${sizeClasses[size]}`}
      style={{ borderColor: `${color}40`, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {displayed}%{showLabel && <span className="opacity-60 font-sans text-xs">accurate</span>}
    </div>
  )
}
