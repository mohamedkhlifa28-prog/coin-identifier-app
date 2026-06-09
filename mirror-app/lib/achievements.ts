import type { AchievementKey, AchievementMeta, LevelMeta } from '@/types'

// ─── Achievement definitions ──────────────────────────────────────────────────

export const ACHIEVEMENTS: Record<AchievementKey, AchievementMeta> = {
  // Mirror
  first_reflection: {
    key: 'first_reflection',
    name: 'First Reflection',
    description: 'Completed onboarding and built your Mirror.',
    mirrorQuote: 'Okay. We\'re doing this.',
    category: 'mirror',
  },
  getting_warmer: {
    key: 'getting_warmer',
    name: 'Getting Warmer',
    description: 'Mirror accuracy reached 60%.',
    mirrorQuote: '60%. I\'m starting to actually sound like me.',
    category: 'mirror',
  },
  uncanny_valley: {
    key: 'uncanny_valley',
    name: 'Uncanny Valley',
    description: 'Mirror accuracy reached 80%.',
    mirrorQuote: '80% accurate. My friends wouldn\'t even know the difference.',
    category: 'mirror',
  },
  ghost_in_machine: {
    key: 'ghost_in_machine',
    name: 'Ghost in the Machine',
    description: 'Mirror accuracy reached 95%.',
    mirrorQuote: '95%. At this point I\'m not sure which one of us is real.',
    category: 'mirror',
  },

  // Memory
  paper_trail: {
    key: 'paper_trail',
    name: 'Paper Trail',
    description: '50 memories stored.',
    mirrorQuote: 'I\'ve been paying attention.',
    category: 'memory',
  },
  living_archive: {
    key: 'living_archive',
    name: 'Living Archive',
    description: '200 memories stored.',
    mirrorQuote: 'I know things about you that you\'ve already forgotten.',
    category: 'memory',
  },
  the_contradiction: {
    key: 'the_contradiction',
    name: 'The Contradiction',
    description: 'First contradiction detected.',
    mirrorQuote: 'So apparently I don\'t actually know what I believe. Cool.',
    category: 'memory',
  },
  self_aware: {
    key: 'self_aware',
    name: 'Self-Aware',
    description: '10 contradictions detected and reviewed.',
    mirrorQuote: 'I contain multitudes. Apparently.',
    category: 'memory',
  },

  // Rival
  first_blood: {
    key: 'first_blood',
    name: 'First Blood',
    description: 'Beat yesterday self for the first time.',
    mirrorQuote: 'There it is.',
    category: 'rival',
  },
  on_a_streak: {
    key: 'on_a_streak',
    name: 'On A Streak',
    description: 'Beat yesterday self 7 days in a row.',
    mirrorQuote: 'Seven days straight. I\'m not going to make a big deal out of it.',
    category: 'rival',
  },
  untouchable: {
    key: 'untouchable',
    name: 'Untouchable',
    description: 'Beat yesterday self 30 days in a row.',
    mirrorQuote: '30 days. Whatever I was doing a month ago, I\'m done with it.',
    category: 'rival',
  },
  legend: {
    key: 'legend',
    name: 'Legend',
    description: 'Beat best ever record 10 times total.',
    mirrorQuote: 'I keep setting the bar higher. It\'s getting annoying.',
    category: 'rival',
  },

  // Journal
  first_entry: {
    key: 'first_entry',
    name: 'First Entry',
    description: 'Wrote your first journal entry.',
    mirrorQuote: 'It\'s a start.',
    category: 'journal',
  },
  consistent: {
    key: 'consistent',
    name: 'Consistent',
    description: 'Journaled 7 days in a row.',
    mirrorQuote: 'Seven days of actually showing up to myself.',
    category: 'journal',
  },
  excavator: {
    key: 'excavator',
    name: 'Excavator',
    description: 'Journaled 30 days in a row.',
    mirrorQuote: 'A month of digging. I\'m starting to find things down here.',
    category: 'journal',
  },
  honest_hour: {
    key: 'honest_hour',
    name: 'Honest Hour',
    description: 'Mirror detected high emotional depth in a journal entry.',
    mirrorQuote: 'That was a real one.',
    category: 'journal',
  },

  // Mental health
  check_in: {
    key: 'check_in',
    name: 'Check In',
    description: 'Completed your first mood check-in.',
    mirrorQuote: 'Noticed.',
    category: 'mental_health',
  },
  pattern_spotter: {
    key: 'pattern_spotter',
    name: 'Pattern Spotter',
    description: 'First emotional pattern identified.',
    mirrorQuote: 'I\'ve been watching. Here\'s what I see.',
    category: 'mental_health',
  },
  naming_it: {
    key: 'naming_it',
    name: 'Naming It',
    description: 'Wrote about an avoidance topic for the first time.',
    mirrorQuote: 'You actually said the thing.',
    category: 'mental_health',
  },
  facing_it: {
    key: 'facing_it',
    name: 'Facing It',
    description: 'Wrote about the same avoidance topic three separate times.',
    mirrorQuote: 'Three times. It\'s not going away, and you keep coming back to it. That means something.',
    category: 'mental_health',
  },

  // Social
  found_your_people: {
    key: 'found_your_people',
    name: 'Found Your People',
    description: 'Joined a Mirror Circle.',
    mirrorQuote: 'People who are doing the work too. Good find.',
    category: 'social',
  },
  letter_sent: {
    key: 'letter_sent',
    name: 'Letter Sent',
    description: 'Sent your first Mirror Letter.',
    mirrorQuote: 'You said the thing they needed to hear, in the voice that would actually land.',
    category: 'social',
  },
  challenge_accepted: {
    key: 'challenge_accepted',
    name: 'Challenge Accepted',
    description: 'Accepted a friend rival challenge.',
    mirrorQuote: 'Okay. Let\'s see what they\'ve got.',
    category: 'social',
  },
  challenge_won: {
    key: 'challenge_won',
    name: 'Challenge Won',
    description: 'Won a friend rival challenge.',
    mirrorQuote: 'I don\'t gloat. But I noticed.',
    category: 'social',
  },

  // Challenges
  day_one: {
    key: 'day_one',
    name: 'Day One',
    description: 'Completed your first micro-challenge.',
    mirrorQuote: 'One down.',
    category: 'challenges',
  },
  week_streak: {
    key: 'week_streak',
    name: 'Week Streak',
    description: 'Completed 7 micro-challenges in a row.',
    mirrorQuote: 'Seven straight days of doing the hard small thing.',
    category: 'challenges',
  },
  month_streak: {
    key: 'month_streak',
    name: 'Month Streak',
    description: 'Completed 30 micro-challenges in a row.',
    mirrorQuote: 'A month of not skipping out on myself.',
    category: 'challenges',
  },
  hard_mode: {
    key: 'hard_mode',
    name: 'Hard Mode',
    description: 'Completed an avoidance-type challenge.',
    mirrorQuote: 'That was the one I\'ve been putting off. Done.',
    category: 'challenges',
  },
}

// ─── Level definitions ────────────────────────────────────────────────────────

export const LEVELS: LevelMeta[] = [
  { level: 1,  name: 'Stranger',     xpRequired: 0,     description: 'Just getting started.' },
  { level: 2,  name: 'Acquaintance', xpRequired: 500,   description: 'Starting to recognise the patterns.' },
  { level: 3,  name: 'Familiar',     xpRequired: 1500,  description: 'Something is clicking.' },
  { level: 4,  name: 'Known',        xpRequired: 3000,  description: 'The Mirror knows what you\'re going to say.' },
  { level: 5,  name: 'Understood',   xpRequired: 6000,  description: 'You\'re starting to understand yourself.' },
  { level: 6,  name: 'Seen',         xpRequired: 10000, description: 'Fully visible — no hiding from it.' },
  { level: 7,  name: 'Honest',       xpRequired: 15000, description: 'The pretending stopped a while back.' },
  { level: 8,  name: 'Transparent',  xpRequired: 22000, description: 'There\'s nothing left to conceal.' },
  { level: 9,  name: 'Integrated',   xpRequired: 30000, description: 'The parts are no longer fighting.' },
  { level: 10, name: 'Mirror',       xpRequired: 40000, description: 'You and your Mirror are indistinguishable.' },
]

export function getLevelForXp(xp: number): LevelMeta {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl
  }
  return current
}

export function getXpToNextLevel(xp: number): { current: LevelMeta; next: LevelMeta | null; progress: number } {
  const current = getLevelForXp(xp)
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null
  const progress = next
    ? Math.min(100, Math.round(((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100))
    : 100
  return { current, next, progress }
}

// ─── XP award amounts ─────────────────────────────────────────────────────────

export const XP_AWARDS = {
  OPEN_MORNING_BRIEF: 10,
  COMPLETE_MOOD_CHECKIN: 5,
  WRITE_JOURNAL_ENTRY: 20,
  COMPLETE_MICRO_CHALLENGE: 30,
  BEAT_YESTERDAY_RIVAL: 25,
  BEAT_BEST_EVER_RIVAL: 100,
  CHAT_SESSION: 10,
  NEW_MEMORY_EXTRACTED: 5,
  UNLOCK_ACHIEVEMENT: 50,
  SEND_MIRROR_LETTER: 15,
  WIN_FRIEND_CHALLENGE: 75,
} as const

// ─── Crisis detection threshold ───────────────────────────────────────────────

export const CRISIS_CONSECUTIVE_DARK_THRESHOLD = 3
export const CRISIS_MODE_HOURS = 48
export const CRISIS_TEXT_LINE = 'text HOME to 741741'
