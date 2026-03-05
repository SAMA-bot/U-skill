
-- Daily productivity checklist items
CREATE TABLE public.daily_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  checklist_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own checklist" ON public.daily_checklist
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reflection journal entries
CREATE TABLE public.reflection_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  mood text DEFAULT 'neutral',
  tags text[] DEFAULT '{}',
  journal_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reflection_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own journal" ON public.reflection_journal
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Streaks tracking
CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  streak_type text NOT NULL DEFAULT 'daily_login',
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own streaks" ON public.user_streaks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Achievement badges
CREATE TABLE public.achievement_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_name text NOT NULL,
  badge_icon text NOT NULL DEFAULT 'award',
  description text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_name)
);

ALTER TABLE public.achievement_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges" ON public.achievement_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges" ON public.achievement_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
