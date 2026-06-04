interface StreakCounterProps {
  days: number
}

export function StreakCounter({ days }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-orange-400">🔥</span>
      <span className="text-sm font-medium text-[#f0f0f0]">{days}</span>
      <span className="text-xs text-[#888888]">day streak</span>
    </div>
  )
}
