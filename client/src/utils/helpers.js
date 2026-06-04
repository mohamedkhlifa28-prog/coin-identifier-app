// Format currency as $X,XXX.XX
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Time ago from date string
export function timeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

// Country flag emoji lookup
const FLAG_MAP = {
  'united states': '🇺🇸',
  'usa': '🇺🇸',
  'us': '🇺🇸',
  'america': '🇺🇸',
  'canada': '🇨🇦',
  'united kingdom': '🇬🇧',
  'uk': '🇬🇧',
  'britain': '🇬🇧',
  'england': '🇬🇧',
  'germany': '🇩🇪',
  'france': '🇫🇷',
  'spain': '🇪🇸',
  'italy': '🇮🇹',
  'japan': '🇯🇵',
  'china': '🇨🇳',
  'australia': '🇦🇺',
  'mexico': '🇲🇽',
  'russia': '🇷🇺',
  'brazil': '🇧🇷',
  'india': '🇮🇳',
  'south korea': '🇰🇷',
  'korea': '🇰🇷',
  'switzerland': '🇨🇭',
  'netherlands': '🇳🇱',
  'belgium': '🇧🇪',
  'austria': '🇦🇹',
  'sweden': '🇸🇪',
  'norway': '🇳🇴',
  'denmark': '🇩🇰',
  'finland': '🇫🇮',
  'portugal': '🇵🇹',
  'greece': '🇬🇷',
  'turkey': '🇹🇷',
  'poland': '🇵🇱',
  'israel': '🇮🇱',
  'south africa': '🇿🇦',
  'egypt': '🇪🇬',
  'argentina': '🇦🇷',
  'chile': '🇨🇱',
  'colombia': '🇨🇴',
  'peru': '🇵🇪',
  'venezuela': '🇻🇪',
  'new zealand': '🇳🇿',
  'singapore': '🇸🇬',
  'hong kong': '🇭🇰',
  'taiwan': '🇹🇼',
  'thailand': '🇹🇭',
  'vietnam': '🇻🇳',
  'philippines': '🇵🇭',
  'indonesia': '🇮🇩',
  'malaysia': '🇲🇾',
  'pakistan': '🇵🇰',
  'ukraine': '🇺🇦',
  'czech republic': '🇨🇿',
  'hungary': '🇭🇺',
  'romania': '🇷🇴',
  'bulgaria': '🇧🇬',
  'croatia': '🇭🇷',
  'slovakia': '🇸🇰',
  'luxembourg': '🇱🇺',
  'ireland': '🇮🇪',
  'iceland': '🇮🇸',
  'estonia': '🇪🇪',
  'latvia': '🇱🇻',
  'lithuania': '🇱🇹',
  'iran': '🇮🇷',
  'iraq': '🇮🇶',
  'saudi arabia': '🇸🇦',
  'uae': '🇦🇪',
  'united arab emirates': '🇦🇪',
  'kenya': '🇰🇪',
  'nigeria': '🇳🇬',
  'ethiopia': '🇪🇹',
  'ghana': '🇬🇭',
  'morocco': '🇲🇦',
  'algeria': '🇩🇿',
  'tunisia': '🇹🇳',
  'cuba': '🇨🇺',
  'haiti': '🇭🇹',
  'dominican republic': '🇩🇴',
  'jamaica': '🇯🇲',
}

export function getCountryFlag(country) {
  if (!country) return '🌍'
  const key = country.toLowerCase().trim()
  return FLAG_MAP[key] || '🌍'
}

// Rarity color classes for text
export function getRarityColor(tier) {
  const map = {
    common: 'text-gray-400',
    uncommon: 'text-green-500',
    rare: 'text-blue-500',
    'very rare': 'text-purple-500',
    'ultra rare': 'text-yellow-500',
  }
  return map[(tier || '').toLowerCase()] || 'text-gray-400'
}

// Rarity border color classes
export function getRarityBorderClass(tier) {
  const map = {
    common: 'border-gray-600',
    uncommon: 'border-green-500',
    rare: 'border-blue-500',
    'very rare': 'border-purple-500',
    'ultra rare': 'border-yellow-500',
  }
  return map[(tier || '').toLowerCase()] || 'border-gray-600'
}

// Get initials from name
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Level icon emoji
export function getLevelIcon(level) {
  if (!level || level < 1) return '🌱'
  if (level < 5) return '🌱'
  if (level < 10) return '🥉'
  if (level < 20) return '🥈'
  if (level < 30) return '🥇'
  if (level < 50) return '💎'
  if (level < 75) return '👑'
  return '🏆'
}

// XP / Level calculations
// Level thresholds: level N requires N*100 XP from previous level
export function calculateProgress(xp) {
  if (!xp || xp < 0) xp = 0
  // Level thresholds: cumulative XP needed per level
  // Level 1: 100, Level 2: 300, Level 3: 600, Level 4: 1000, ...
  // Formula: cumXP = level*(level+1)/2 * 100
  let level = 1
  while (true) {
    const cumXpForNextLevel = ((level + 1) * (level + 2)) / 2 * 100
    if (xp < cumXpForNextLevel) break
    level++
  }
  const cumXpCurrentLevel = (level * (level + 1)) / 2 * 100
  const cumXpNextLevel = ((level + 1) * (level + 2)) / 2 * 100
  const xpIntoCurrentLevel = xp - cumXpCurrentLevel
  const xpNeeded = cumXpNextLevel - cumXpCurrentLevel
  const progress = Math.min(100, Math.floor((xpIntoCurrentLevel / xpNeeded) * 100))

  return {
    current: level,
    nextLevel: level + 1,
    progress,
    xpNeeded: xpNeeded - xpIntoCurrentLevel,
    totalXp: xp,
  }
}

// Rarity hex colors (for inline styles)
export function getRarityHexColor(tier) {
  const map = {
    common: '#9CA3AF',
    uncommon: '#22C55E',
    rare: '#3B82F6',
    'very rare': '#A855F7',
    'ultra rare': '#D4A017',
  }
  return map[(tier || '').toLowerCase()] || '#9CA3AF'
}

// Truncate text with ellipsis
export function truncate(text, maxLength = 30) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
}
