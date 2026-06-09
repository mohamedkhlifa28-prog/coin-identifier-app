-- ============================================================
-- Mirror App — Schema v2
-- Apply this on top of schema.sql (which must already exist).
-- Run in the Supabase SQL editor or via CLI.
-- ============================================================

-- ─── 1. Extend existing tables ───────────────────────────────

-- XP + level progression (Pillar 4C)
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp             INT          DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level          INT          DEFAULT 1;
-- Crisis mode: Mirror stays gentler until this timestamp (Pillar 1D)
ALTER TABLE users ADD COLUMN IF NOT EXISTS crisis_mode_until TIMESTAMPTZ DEFAULT NULL;

-- Long-term life summary synthesised monthly from all memories (Pillar 2C)
ALTER TABLE voice_profiles ADD COLUMN IF NOT EXISTS life_summary TEXT DEFAULT NULL;
-- Memory themes updated weekly (Pillar 2C)
ALTER TABLE voice_profiles ADD COLUMN IF NOT EXISTS memory_themes JSONB DEFAULT '[]';

-- ─── 2. Morning Briefs (Pillar 1A) ───────────────────────────

CREATE TABLE IF NOT EXISTS morning_briefs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Full brief as structured JSON (see MorningBriefContent type)
  brief_json    JSONB       NOT NULL DEFAULT '{}',
  -- Whether the user actually opened it today
  opened        BOOLEAN     NOT NULL DEFAULT false,
  -- User's typed/tapped mood response to the mood_question
  mood_response TEXT,
  date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS morning_briefs_user_date
  ON morning_briefs(user_id, date);

CREATE INDEX IF NOT EXISTS morning_briefs_user_id_idx
  ON morning_briefs(user_id);

-- ─── 3. Mirror Journal (Pillar 1B) ───────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content            TEXT        NOT NULL,
  -- Mirror's three-part response (generated async after submission)
  mirror_reflection  TEXT,                     -- "So basically you're saying…"
  mirror_pattern     TEXT,                     -- "You wrote almost the same on [date]…"
  mirror_question    TEXT,                     -- Follow-up question in user's voice
  mood_tag           TEXT,                     -- Auto-detected by Mirror
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx
  ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS journal_entries_created_at_idx
  ON journal_entries(created_at);

-- ─── 4. Smart Reminders (Pillar 1C) ──────────────────────────

CREATE TABLE IF NOT EXISTS reminders (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text  TEXT,
  mirror_text    TEXT,                     -- Rewritten by Claude in user's voice
  scheduled_for  TIMESTAMPTZ,
  repeat_rule    TEXT,                     -- 'daily' | 'weekly' | 'once'
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reminders_user_id_idx
  ON reminders(user_id);
CREATE INDEX IF NOT EXISTS reminders_scheduled_for_idx
  ON reminders(scheduled_for) WHERE is_active = true;

-- ─── 5. Mood Check-ins (Pillar 1D) ───────────────────────────

CREATE TABLE IF NOT EXISTS mood_checkins (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'thriving' | 'good' | 'meh' | 'struggling' | 'dark'
  mood        TEXT        NOT NULL,
  -- 'manual' | 'journal' | 'chat'
  source      TEXT        NOT NULL DEFAULT 'manual',
  note        TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mood_checkins_user_id_idx
  ON mood_checkins(user_id);
CREATE INDEX IF NOT EXISTS mood_checkins_detected_at_idx
  ON mood_checkins(user_id, detected_at);

-- ─── 6. Emotional Patterns (Pillar 2A) ───────────────────────

CREATE TABLE IF NOT EXISTS emotional_patterns (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- See EmotionalPatternsData type for shape
  patterns_json JSONB      NOT NULL,
  analyzed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emotional_patterns_user_id_idx
  ON emotional_patterns(user_id);

-- ─── 7. Daily Micro-Challenges (Pillar 4A) ───────────────────

CREATE TABLE IF NOT EXISTS daily_challenges (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_text TEXT    NOT NULL,
  -- 'mindset' | 'physical' | 'social' | 'reflection' | 'avoidance'
  challenge_type TEXT,
  completed      BOOLEAN NOT NULL DEFAULT false,
  skipped        BOOLEAN NOT NULL DEFAULT false,
  date           DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_challenges_user_date
  ON daily_challenges(user_id, date);
CREATE INDEX IF NOT EXISTS daily_challenges_user_id_idx
  ON daily_challenges(user_id);

-- ─── 8. Achievements (Pillar 4B) ─────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key TEXT        NOT NULL,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS achievements_user_id_idx
  ON achievements(user_id);

-- ─── 9. Weekly Rewinds (Pillar 4D) ───────────────────────────

CREATE TABLE IF NOT EXISTS rewinds (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,         -- Full rewind in user's voice
  week_start DATE,
  week_end   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rewinds_user_id_idx
  ON rewinds(user_id);
CREATE INDEX IF NOT EXISTS rewinds_week_start_idx
  ON rewinds(user_id, week_start);

-- ─── 10. Mirror Circles (Pillar 3A) ──────────────────────────

CREATE TABLE IF NOT EXISTS circles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  focus       TEXT,
  created_by  UUID        REFERENCES users(id),
  invite_code TEXT        UNIQUE,
  max_members INT         NOT NULL DEFAULT 6,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS circle_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     UUID        NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'public' | 'wins-only' | 'anonymous'
  privacy_level TEXT        NOT NULL DEFAULT 'public',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS circle_activity (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     UUID        NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'journaled' | 'beat_rival' | 'milestone' | 'streak'
  activity_type TEXT,
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS circle_members_circle_id_idx
  ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS circle_members_user_id_idx
  ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS circle_activity_circle_id_idx
  ON circle_activity(circle_id, created_at);

-- ─── 11. Mirror Letters (Pillar 3B) ──────────────────────────

CREATE TABLE IF NOT EXISTS mirror_letters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID        NOT NULL REFERENCES users(id),
  recipient_id    UUID        NOT NULL REFERENCES users(id),
  sender_intent   TEXT,                    -- What the sender wanted to convey
  letter_content  TEXT,                    -- Written by Claude in recipient's voice
  is_read         BOOLEAN     NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mirror_letters_recipient_idx
  ON mirror_letters(recipient_id, sent_at);
CREATE INDEX IF NOT EXISTS mirror_letters_sender_idx
  ON mirror_letters(sender_id);

-- ─── 12. User Connections (needed for Mirror Letters) ─────────

CREATE TABLE IF NOT EXISTS user_connections (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Whether recipient allows Mirror Letters from this sender
  mirror_letters_enabled BOOLEAN    NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, connected_user_id)
);

CREATE INDEX IF NOT EXISTS user_connections_user_id_idx
  ON user_connections(user_id);

-- ─── 13. Community Posts (Pillar 3C) ─────────────────────────

CREATE TABLE IF NOT EXISTS community_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id),   -- stored but never shown publicly
  content    TEXT        NOT NULL,
  -- 'quote' | 'contradiction' | 'win' | 'intention'
  post_type  TEXT,
  reactions  JSONB       NOT NULL DEFAULT '{"felt_this":0,"same":0,"real":0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_posts_created_at_idx
  ON community_posts(created_at DESC);

-- ─── 14. Mirror Asks Settings (Pillar 2D) ─────────────────────

CREATE TABLE IF NOT EXISTS mirror_asks_settings (
  user_id               UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pattern_questions     BOOLEAN NOT NULL DEFAULT true,
  avoidance_callouts    BOOLEAN NOT NULL DEFAULT true,
  win_celebrations      BOOLEAN NOT NULL DEFAULT true,
  memory_resurfaces     BOOLEAN NOT NULL DEFAULT true,
  contradiction_surfaces BOOLEAN NOT NULL DEFAULT true
);

-- ─── 15. Row Level Security ───────────────────────────────────

ALTER TABLE morning_briefs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_checkins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewinds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_activity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirror_letters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirror_asks_settings ENABLE ROW LEVEL SECURITY;

-- User-owned tables: full access to own rows only
CREATE POLICY "Own morning_briefs"     ON morning_briefs     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own journal_entries"    ON journal_entries    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own reminders"          ON reminders          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own mood_checkins"      ON mood_checkins      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own emotional_patterns" ON emotional_patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own daily_challenges"   ON daily_challenges   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own achievements"       ON achievements       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own rewinds"            ON rewinds            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own user_connections"   ON user_connections   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own mirror_asks_settings" ON mirror_asks_settings FOR ALL USING (auth.uid() = user_id);

-- Circles: any member can read; creator can insert/update/delete
CREATE POLICY "Circle members can read"
  ON circles FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.circle_id = circles.id
        AND circle_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Circle creator manages"
  ON circles FOR ALL
  USING (auth.uid() = created_by);

-- Circle members: members read their own circle's roster
CREATE POLICY "Circle member data"
  ON circle_members FOR ALL
  USING (auth.uid() = user_id);
CREATE POLICY "Circle members see roster"
  ON circle_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm2
      WHERE cm2.circle_id = circle_members.circle_id
        AND cm2.user_id = auth.uid()
    )
  );

-- Circle activity: members of the circle can read the feed
CREATE POLICY "Circle activity feed"
  ON circle_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.circle_id = circle_activity.circle_id
        AND circle_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Own circle activity"
  ON circle_activity FOR ALL
  USING (auth.uid() = user_id);

-- Mirror letters: sender and recipient can read; only sender inserts
CREATE POLICY "Mirror letter sender"
  ON mirror_letters FOR ALL
  USING (auth.uid() = sender_id);
CREATE POLICY "Mirror letter recipient reads"
  ON mirror_letters FOR SELECT
  USING (auth.uid() = recipient_id);
CREATE POLICY "Mirror letter recipient updates"
  ON mirror_letters FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Community posts: anyone can read; own user writes and deletes
CREATE POLICY "Community posts public read"
  ON community_posts FOR SELECT
  USING (true);
CREATE POLICY "Community posts own write"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Community posts own delete"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 16. Helper functions ────────────────────────────────────

-- Award XP and recalculate level in one DB round-trip
CREATE OR REPLACE FUNCTION award_xp(uid UUID, amount INT)
RETURNS TABLE(new_xp INT, new_level INT, leveled_up BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _xp    INT;
  _level INT;
  _new_level INT;
  _leveled_up BOOLEAN := false;
  -- Level thresholds: index = level (1-10)
  thresholds INT[] := ARRAY[0, 500, 1500, 3000, 6000, 10000, 15000, 22000, 30000, 40000];
BEGIN
  UPDATE users
  SET xp = xp + amount
  WHERE id = uid
  RETURNING xp, level INTO _xp, _level;

  -- Calculate new level
  _new_level := _level;
  FOR i IN 1..10 LOOP
    IF _xp >= thresholds[i] THEN
      _new_level := i;
    END IF;
  END LOOP;

  IF _new_level <> _level THEN
    UPDATE users SET level = _new_level WHERE id = uid;
    _leveled_up := true;
  END IF;

  RETURN QUERY SELECT _xp, _new_level, _leveled_up;
END;
$$;

-- Unlock an achievement (idempotent — returns false if already unlocked)
CREATE OR REPLACE FUNCTION unlock_achievement(uid UUID, key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO achievements(user_id, achievement_key)
  VALUES (uid, key)
  ON CONFLICT (user_id, achievement_key) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- Count consecutive "dark" moods (for crisis detection)
CREATE OR REPLACE FUNCTION count_consecutive_dark_moods(uid UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INT
  FROM (
    SELECT mood, detected_at,
           ROW_NUMBER() OVER (ORDER BY detected_at DESC) AS rn
    FROM mood_checkins
    WHERE user_id = uid
    ORDER BY detected_at DESC
    LIMIT 10
  ) sub
  WHERE mood = 'dark'
    AND rn = (
      SELECT COUNT(*) + 1 FROM mood_checkins
      WHERE user_id = uid
        AND detected_at > sub.detected_at
        AND mood <> 'dark'
    )
$$;
