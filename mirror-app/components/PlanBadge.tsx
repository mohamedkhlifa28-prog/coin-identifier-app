import type { Plan } from '@/types'

interface PlanBadgeProps {
  plan: Plan
}

const PLAN_STYLES: Record<Plan, { label: string; color: string; bg: string }> = {
  free: { label: 'Free', color: '#888888', bg: '#88888820' },
  pro: { label: 'Pro', color: '#a78bfa', bg: '#a78bfa20' },
  platinum: { label: 'Platinum', color: '#fbbf24', bg: '#fbbf2420' },
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const style = PLAN_STYLES[plan]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: style.color, background: style.bg }}
    >
      {style.label}
    </span>
  )
}
