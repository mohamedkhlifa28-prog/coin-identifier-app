-- Enable pgvector for memory embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (mirrors Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  stripe_customer_id TEXT,
  plan TEXT DEFAULT 'free',  -- 'free' | 'pro' | 'platinum'
  mirror_age_days INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice profiles (the AI personality model for each user)
CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  profile_json JSONB NOT NULL DEFAULT '{}',
  accuracy_score INT DEFAULT 40,
  version INT DEFAULT 1,
  total_sessions INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages_json JSONB NOT NULL DEFAULT '[]',
  traits_extracted JSONB DEFAULT '[]',
  title TEXT,
  session_date TIMESTAMPTZ DEFAULT NOW()
);
-- Run this if conversations table already exists:
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title TEXT;

-- Memory bank — every notable quote or moment the user has said
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  context TEXT,
  tags TEXT[],
  weight INT DEFAULT 5,  -- emotional importance 1-10
  session_id UUID REFERENCES conversations(id),
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(1536)  -- pgvector embedding
);
CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX memories_user_id_idx ON memories(user_id);
CREATE INDEX memories_created_at_idx ON memories(created_at);
CREATE INDEX conversations_user_id_idx ON conversations(user_id, session_date);
CREATE INDEX contradictions_user_id_idx ON contradictions(user_id);
CREATE INDEX shared_mirrors_user_id_idx ON shared_mirrors(user_id);

-- Contradiction pairs detected between memories
CREATE TABLE contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_id_1 UUID REFERENCES memories(id) ON DELETE CASCADE,
  memory_id_2 UUID REFERENCES memories(id) ON DELETE CASCADE,
  explanation TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared mirrors for the viral loop feature
CREATE TABLE shared_mirrors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice clones (ElevenLabs)
CREATE TABLE voice_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  elevenlabs_voice_id TEXT NOT NULL,
  sample_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_mirrors ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_clones ENABLE ROW LEVEL SECURITY;

-- RLS policies (users can only read/write their own data)
CREATE POLICY "Users own data" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own profiles" ON voice_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own memories" ON memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own contradictions" ON contradictions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own shared mirrors" ON shared_mirrors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own voice clones" ON voice_clones FOR ALL USING (auth.uid() = user_id);

-- Allow public read of shared mirrors (for /mirror/[slug] page — no login required)
CREATE POLICY "Public can read active shared mirrors" ON shared_mirrors
  FOR SELECT USING (is_active = true);

-- Trigger: auto-create a users row after Supabase auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: semantic memory search using pgvector cosine similarity
CREATE OR REPLACE FUNCTION search_memories(
  user_id_param UUID,
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  quote TEXT,
  context TEXT,
  tags TEXT[],
  weight INT,
  pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.quote,
    m.context,
    m.tags,
    m.weight,
    m.pinned,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE
    m.user_id = user_id_param
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RPC: increment total_sessions on voice profile
CREATE OR REPLACE FUNCTION increment_voice_profile_sessions(uid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE voice_profiles
  SET total_sessions = total_sessions + 1
  WHERE user_id = uid;
END;
$$;
