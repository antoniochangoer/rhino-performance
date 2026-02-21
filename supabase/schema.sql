-- ============================================================
-- Rhino Performance – Supabase Database Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ---- Profiles (extends auth.users) ----
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username   TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---- Programs ----
CREATE TABLE IF NOT EXISTS public.programs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  goal          TEXT DEFAULT 'peaking',
  total_weeks   INT  DEFAULT 8,
  start_rpe     FLOAT DEFAULT 7,
  current_index INT  DEFAULT 0,
  current_week  INT  DEFAULT 1,
  active        BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;


-- ---- Sessions ----
CREATE TABLE IF NOT EXISTS public.sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INT  DEFAULT 0
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;


-- ---- Exercises ----
CREATE TABLE IF NOT EXISTS public.exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.sessions ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sets        INT   DEFAULT 3,
  target_reps INT   DEFAULT 5,
  target_rpe  FLOAT DEFAULT 7,
  start_rpe   FLOAT DEFAULT 7,
  one_rep_max FLOAT DEFAULT 0,
  position    INT   DEFAULT 0
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;


-- ---- Training Logs ----
CREATE TABLE IF NOT EXISTS public.training_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  program_id    UUID REFERENCES public.programs ON DELETE SET NULL,
  session_id    UUID REFERENCES public.sessions ON DELETE SET NULL,
  session_name  TEXT,
  session_index INT  DEFAULT 0,
  week_number   INT  DEFAULT 1,
  date          DATE DEFAULT CURRENT_DATE,
  status        TEXT DEFAULT 'active',
  exercises     JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;


-- ---- Program Shares ----
-- Must be created BEFORE the RLS policies on programs/sessions/exercises that reference it
CREATE TABLE IF NOT EXISTS public.program_shares (
  program_id  UUID NOT NULL REFERENCES public.programs ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (program_id, shared_with)
);

ALTER TABLE public.program_shares ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS Policies (added after ALL tables exist)
-- ============================================================

-- Programs: owner full access
CREATE POLICY "Owner full access on programs"
  ON public.programs FOR ALL
  USING (auth.uid() = user_id);

-- Programs: shared programs are readable
CREATE POLICY "Shared programs are readable"
  ON public.programs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_shares ps
      WHERE ps.program_id = programs.id
        AND ps.shared_with = auth.uid()
    )
  );

-- Sessions: access via program ownership
CREATE POLICY "Session access via program ownership"
  ON public.sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = sessions.program_id
        AND p.user_id = auth.uid()
    )
  );

-- Sessions: readable via share
CREATE POLICY "Session readable via share"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_shares ps
      WHERE ps.program_id = sessions.program_id
        AND ps.shared_with = auth.uid()
    )
  );

-- Exercises: access via program ownership
CREATE POLICY "Exercise access via program ownership"
  ON public.exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.programs p ON p.id = s.program_id
      WHERE s.id = exercises.session_id
        AND p.user_id = auth.uid()
    )
  );

-- Exercises: readable via share
CREATE POLICY "Exercise readable via share"
  ON public.exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.program_shares ps ON ps.program_id = s.program_id
      WHERE s.id = exercises.session_id
        AND ps.shared_with = auth.uid()
    )
  );

-- Training logs: users manage own logs only
CREATE POLICY "Users can manage own logs"
  ON public.training_logs FOR ALL
  USING (auth.uid() = user_id);

-- Program shares: owner can manage
CREATE POLICY "Owner can manage shares"
  ON public.program_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_shares.program_id
        AND p.user_id = auth.uid()
    )
  );

-- Program shares: shared user can see their own shares
CREATE POLICY "Shared user can see own shares"
  ON public.program_shares FOR SELECT
  USING (auth.uid() = shared_with);
