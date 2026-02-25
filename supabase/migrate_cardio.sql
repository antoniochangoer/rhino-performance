-- ============================================================
-- Rhino Performance — Cardio & HR zones migration
-- Run in Supabase SQL Editor after migrate.sql
-- ============================================================

-- 1. Profile columns for heart rate zones (Karvonen)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_year INT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resting_heart_rate INT DEFAULT NULL;

-- 2. Cardio activities table
CREATE TABLE IF NOT EXISTS public.cardio_activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  name              TEXT NOT NULL,
  duration_minutes   INT NOT NULL DEFAULT 0,
  type              TEXT NOT NULL DEFAULT 'aerobic' CHECK (type IN ('aerobic', 'anaerobic')),
  zone              INT DEFAULT NULL CHECK (zone >= 1 AND zone <= 5),
  avg_hr            INT DEFAULT NULL,
  max_hr            INT DEFAULT NULL,
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cardio_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cardio"
  ON public.cardio_activities FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cardio_activities_user_date
  ON public.cardio_activities (user_id, date DESC);
