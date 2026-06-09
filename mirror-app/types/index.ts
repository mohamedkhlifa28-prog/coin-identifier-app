// ─── Core enums ──────────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro' | 'platinum'

export type HumorStyle = 'dry' | 'self-deprecating' | 'absurdist' | 'none'
export type CommunicationStyle =
  | 'direct'
  | 'storytelling'
  | 'bullet-points'
  | 'stream-of-consciousness'
export type EmotionalRegister = 'warm' | 'cold' | 'analytical' | 'empathetic'

export type MoodLevel = 'thriving' | 'good' | 'meh' | 'struggling' | 'dark'
export type MoodSource = 'manual' | 'journal' | 'chat'

export type ChallengeType = 'mindset' | 'physical' | 'social' | 'reflection' | 'avoidance'
export type RepeatRule = 'daily' | 'weekly' | 'once'

export type CirclePrivacyLevel = 'public' | 'wins-only' | 'anonymous'
export type CircleActivityType = 'journaled' | 'beat_rival' | 'milestone' | 'streak'

export type CommunityPostType = 'quote' | 'contradiction' | 'win' | 'intention'

// ─── Voice Profile ────────────────────────────────────────────────────────────

export interface VoiceProfileData {
  humor_style: HumorStyle
  formality_level: number // 1-10
  common_phrases: string[]
  core_values: string[]
  pet_peeves: string[]
  communication_style: CommunicationStyle
  vocabulary_samples: string[]
  opinions: { topic: string; stance: string }[]
  emotional_register: EmotionalRegister
  topics_they_love: string[]
  topics_they_avoid: string[]
  writing_quirks: string[]
  accuracy_score: number
}

// ─── Core DB rows ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string | null
  stripe_customer_id: string | null
  plan: Plan
  mirror_age_days: number
  streak_days: number
  last_active: string
  created_at: string
  // v2 additions
  xp: number
  level: number
  crisis_mode_until: string | null
}

export interface VoiceProfile {
  id: string
  user_id: string
  profile_json: VoiceProfileData
  accuracy_score: number
  version: number
  total_sessions: number
  updated_at: string
  // v2 additions
  life_summary: string | null
  memory_themes: MemoryTheme[]
}

export interface MemoryTheme {
  theme: string
  description: string
  frequency: number
}

export interface Conversation {
  id: string
  user_id: string
  messages_json: Message[]
  traits_extracted: string[]
  session_date: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Memory {
  id: string
  user_id: string
  quote: string
  context: string | null
  tags: string[]
  weight: number
  session_id: string | null
  pinned: boolean
  created_at: string
  embedding?: number[]
}

export interface Contradiction {
  id: string
  user_id: string
  memory_id_1: string
  memory_id_2: string
  explanation: string
  detected_at: string
  memory_1?: Memory
  memory_2?: Memory
}

export interface SharedMirror {
  id: string
  user_id: string
  slug: string
  is_active: boolean
  views: number
  created_at: string
}

export interface VoiceClone {
  id: string
  user_id: string
  elevenlabs_voice_id: string
  sample_url: string | null
  created_at: string
}

// ─── Pillar 1A — Morning Brief ────────────────────────────────────────────────

export interface MorningBriefContent {
  mood_question: string
  intentions: string[]
  mirror_observation: string
  past_quote: {
    quote: string
    date: string
    relevance: string
  }
  rival_recap: string
  micro_challenge: {
    text: string
    type: ChallengeType
  }
}

export interface MorningBrief {
  id: string
  user_id: string
  brief_json: MorningBriefContent
  opened: boolean
  mood_response: string | null
  date: string
  created_at: string
}

// ─── Pillar 1B — Mirror Journal ───────────────────────────────────────────────

export interface JournalEntry {
  id: string
  user_id: string
  content: string
  mirror_reflection: string | null
  mirror_pattern: string | null
  mirror_question: string | null
  mood_tag: string | null
  created_at: string
}

// ─── Pillar 1C — Reminders ────────────────────────────────────────────────────

export interface Reminder {
  id: string
  user_id: string
  original_text: string | null
  mirror_text: string | null
  scheduled_for: string | null
  repeat_rule: RepeatRule | null
  is_active: boolean
  created_at: string
}

// ─── Pillar 1D — Mood Check-ins ───────────────────────────────────────────────

export interface MoodCheckin {
  id: string
  user_id: string
  mood: MoodLevel
  source: MoodSource
  note: string | null
  detected_at: string
}

// ─── Pillar 2A — Emotional Patterns ──────────────────────────────────────────

export interface EmotionalTrigger {
  situation: string
  emotion: string
  frequency: number
}

export interface EmotionalPatternsData {
  triggers: EmotionalTrigger[]
  coping_patterns: string[]
  energy_pattern: string
  avoidance_topics: string[]
  summary: string
}

export interface EmotionalPattern {
  id: string
  user_id: string
  patterns_json: EmotionalPatternsData
  analyzed_at: string
}

// ─── Pillar 2B — Growth Score ─────────────────────────────────────────────────

export interface GrowthScoreDimensions {
  mood_trend: number       // 0-100
  rival_consistency: number
  journal_consistency: number
  contradiction_resolution: number
  brief_engagement: number
  accuracy_growth: number
}

export interface GrowthScore {
  score: number
  dimensions: GrowthScoreDimensions
  week_change: number
  mirror_comment: string
  calculated_at: string
}

// ─── Pillar 4A — Daily Challenges ────────────────────────────────────────────

export interface DailyChallenge {
  id: string
  user_id: string
  challenge_text: string
  challenge_type: ChallengeType | null
  completed: boolean
  skipped: boolean
  date: string
  created_at: string
}

// ─── Pillar 4B — Achievements ─────────────────────────────────────────────────

export type AchievementKey =
  // Mirror
  | 'first_reflection'
  | 'getting_warmer'
  | 'uncanny_valley'
  | 'ghost_in_machine'
  // Memory
  | 'paper_trail'
  | 'living_archive'
  | 'the_contradiction'
  | 'self_aware'
  // Rival
  | 'first_blood'
  | 'on_a_streak'
  | 'untouchable'
  | 'legend'
  // Journal
  | 'first_entry'
  | 'consistent'
  | 'excavator'
  | 'honest_hour'
  // Mental health
  | 'check_in'
  | 'pattern_spotter'
  | 'naming_it'
  | 'facing_it'
  // Social
  | 'found_your_people'
  | 'letter_sent'
  | 'challenge_accepted'
  | 'challenge_won'
  // Challenges
  | 'day_one'
  | 'week_streak'
  | 'month_streak'
  | 'hard_mode'

export interface AchievementMeta {
  key: AchievementKey
  name: string
  description: string
  mirrorQuote: string
  category: 'mirror' | 'memory' | 'rival' | 'journal' | 'mental_health' | 'social' | 'challenges'
}

export interface Achievement {
  id: string
  user_id: string
  achievement_key: AchievementKey
  unlocked_at: string
}

// ─── Pillar 4C — XP & Levels ──────────────────────────────────────────────────

export interface LevelMeta {
  level: number
  name: string
  xpRequired: number
  description: string
}

// ─── Pillar 4D — Rewinds ─────────────────────────────────────────────────────

export interface Rewind {
  id: string
  user_id: string
  content: string
  week_start: string
  week_end: string
  created_at: string
}

// ─── Pillar 3A — Mirror Circles ───────────────────────────────────────────────

export interface Circle {
  id: string
  name: string
  focus: string | null
  created_by: string
  invite_code: string
  max_members: number
  created_at: string
}

export interface CircleMember {
  id: string
  circle_id: string
  user_id: string
  privacy_level: CirclePrivacyLevel
  joined_at: string
  // Joined fields
  user?: { name: string | null; email: string }
}

export interface CircleActivityItem {
  id: string
  circle_id: string
  user_id: string
  activity_type: CircleActivityType | null
  message: string | null
  created_at: string
  // Joined fields
  user?: { name: string | null }
}

// ─── Pillar 3B — Mirror Letters ───────────────────────────────────────────────

export interface MirrorLetter {
  id: string
  sender_id: string
  recipient_id: string
  sender_intent: string | null
  letter_content: string | null
  is_read: boolean
  sent_at: string
  // Joined fields
  sender?: { name: string | null }
}

export interface UserConnection {
  id: string
  user_id: string
  connected_user_id: string
  mirror_letters_enabled: boolean
  created_at: string
  connected_user?: { name: string | null; email: string }
}

// ─── Pillar 3C — Community Feed ───────────────────────────────────────────────

export interface CommunityPost {
  id: string
  user_id: string
  content: string
  post_type: CommunityPostType | null
  reactions: { felt_this: number; same: number; real: number }
  created_at: string
}

// ─── Pillar 2D — Mirror Asks Settings ─────────────────────────────────────────

export interface MirrorAsksSettings {
  user_id: string
  pattern_questions: boolean
  avoidance_callouts: boolean
  win_celebrations: boolean
  memory_resurfaces: boolean
  contradiction_surfaces: boolean
}

// ─── Supabase Database type map ───────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Partial<User> & { email: string }
        Update: Partial<User>
      }
      voice_profiles: {
        Row: VoiceProfile
        Insert: Partial<VoiceProfile> & { user_id: string; profile_json: VoiceProfileData }
        Update: Partial<VoiceProfile>
      }
      conversations: {
        Row: Conversation
        Insert: Partial<Conversation> & { user_id: string; messages_json: Message[] }
        Update: Partial<Conversation>
      }
      memories: {
        Row: Memory
        Insert: Partial<Memory> & { user_id: string; quote: string }
        Update: Partial<Memory>
      }
      contradictions: {
        Row: Contradiction
        Insert: Partial<Contradiction> & {
          user_id: string
          memory_id_1: string
          memory_id_2: string
        }
        Update: Partial<Contradiction>
      }
      shared_mirrors: {
        Row: SharedMirror
        Insert: Partial<SharedMirror> & { user_id: string; slug: string }
        Update: Partial<SharedMirror>
      }
      voice_clones: {
        Row: VoiceClone
        Insert: Partial<VoiceClone> & { user_id: string; elevenlabs_voice_id: string }
        Update: Partial<VoiceClone>
      }
      morning_briefs: {
        Row: MorningBrief
        Insert: Partial<MorningBrief> & { user_id: string; brief_json: MorningBriefContent }
        Update: Partial<MorningBrief>
      }
      journal_entries: {
        Row: JournalEntry
        Insert: Partial<JournalEntry> & { user_id: string; content: string }
        Update: Partial<JournalEntry>
      }
      reminders: {
        Row: Reminder
        Insert: Partial<Reminder> & { user_id: string }
        Update: Partial<Reminder>
      }
      mood_checkins: {
        Row: MoodCheckin
        Insert: Partial<MoodCheckin> & { user_id: string; mood: MoodLevel }
        Update: Partial<MoodCheckin>
      }
      emotional_patterns: {
        Row: EmotionalPattern
        Insert: Partial<EmotionalPattern> & { user_id: string; patterns_json: EmotionalPatternsData }
        Update: Partial<EmotionalPattern>
      }
      daily_challenges: {
        Row: DailyChallenge
        Insert: Partial<DailyChallenge> & { user_id: string; challenge_text: string }
        Update: Partial<DailyChallenge>
      }
      achievements: {
        Row: Achievement
        Insert: Partial<Achievement> & { user_id: string; achievement_key: AchievementKey }
        Update: Partial<Achievement>
      }
      rewinds: {
        Row: Rewind
        Insert: Partial<Rewind> & { user_id: string; content: string }
        Update: Partial<Rewind>
      }
      circles: {
        Row: Circle
        Insert: Partial<Circle> & { name: string; created_by: string }
        Update: Partial<Circle>
      }
      circle_members: {
        Row: CircleMember
        Insert: Partial<CircleMember> & { circle_id: string; user_id: string }
        Update: Partial<CircleMember>
      }
      circle_activity: {
        Row: CircleActivityItem
        Insert: Partial<CircleActivityItem> & { circle_id: string; user_id: string }
        Update: Partial<CircleActivityItem>
      }
      mirror_letters: {
        Row: MirrorLetter
        Insert: Partial<MirrorLetter> & { sender_id: string; recipient_id: string }
        Update: Partial<MirrorLetter>
      }
      user_connections: {
        Row: UserConnection
        Insert: Partial<UserConnection> & { user_id: string; connected_user_id: string }
        Update: Partial<UserConnection>
      }
      community_posts: {
        Row: CommunityPost
        Insert: Partial<CommunityPost> & { user_id: string; content: string }
        Update: Partial<CommunityPost>
      }
      mirror_asks_settings: {
        Row: MirrorAsksSettings
        Insert: Partial<MirrorAsksSettings> & { user_id: string }
        Update: Partial<MirrorAsksSettings>
      }
    }
  }
}
