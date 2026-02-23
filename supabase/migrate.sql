-- ============================================================
-- Rhino Performance — Run this ONCE in Supabase SQL editor
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. New columns on programs (deep-copy share tracking)
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS shared_from UUID REFERENCES auth.users ON DELETE SET NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS shared_from_name TEXT DEFAULT NULL;

-- 2. New columns on program_shares
ALTER TABLE public.program_shares ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE public.program_shares ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.program_shares ADD COLUMN IF NOT EXISTS program_name TEXT DEFAULT '';
ALTER TABLE public.program_shares ADD COLUMN IF NOT EXISTS program_goal TEXT DEFAULT '';
ALTER TABLE public.program_shares ADD COLUMN IF NOT EXISTS program_weeks INT DEFAULT 0;
ALTER TABLE public.program_shares ADD COLUMN IF NOT EXISTS copy_program_id UUID REFERENCES public.programs ON DELETE SET NULL;

-- 3. New columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS main_lifts_1rm JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_program_id UUID REFERENCES public.programs ON DELETE SET NULL;

-- 4. Allow reading other users' profiles (needed for share username lookups)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
