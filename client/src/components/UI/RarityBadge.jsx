import { getRarityHexColor } from '../../utils/helpers'

const RARITY_CONFIG = {
  common: {
    label: 'Common',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-600',
    bgClass: 'bg-gray-800',
  },
  uncommon: {
    label: 'Uncommon',
    textClass: 'text-green-400',
    borderClass: 'border-green-500',
    bgClass: 'bg-green-900/30',
  },
  rare: {
    label: 'Rare',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-900/30',
  },
  'very rare': {
    label: 'Very Rare',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500',
    bgClass: 'bg-purple-900/30',
  },
  'ultra rare': {
    label: 'Ultra Rare',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500',
    bgClass: 'bg-yellow-900/30',
    shimmer: true,
  },
}

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export default function RarityBadge({ tier, size = 'md' }) {
  const key = (tier || 'common').toLowerCase()
  const config = RARITY_CONFIG[key] || RARITY_CONFIG.common
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md

  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-semibold rounded-full border',
        'font-body tracking-wide',
        sizeClass,
        config.textClass,
        config.borderClass,
        config.bgClass,
        config.shimmer ? 'animate-pulse-gold' : '',
      ].join(' ')}
    >
      {key === 'ultra rare' && <span className="text-xs">✦</span>}
      {config.label}
    </span>
  )
}
