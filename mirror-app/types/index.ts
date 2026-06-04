export type Plan = 'free' | 'pro' | 'platinum'

export type HumorStyle = 'dry' | 'self-deprecating' | 'absurdist' | 'none'
export type CommunicationStyle =
  | 'direct'
  | 'storytelling'
  | 'bullet-points'
  | 'stream-of-consciousness'
export type EmotionalRegister = 'warm' | 'cold' | 'analytical' | 'empathetic'

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
}

export interface VoiceProfile {
  id: string
  user_id: string
  profile_json: VoiceProfileData
  accuracy_score: number
  version: number
  total_sessions: number
  updated_at: string
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

// Supabase Database types
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
    }
  }
}
