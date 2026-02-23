-- ============================================================
-- Rhino Performance — Run this ONCE in Supabase SQL editor
-- Dashboard → SQL Editor → New query → paste everything → Run
-- ============================================================

-- 1. New columns on programs
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

-- 4. Profile policies — publicly readable for share username lookups
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. SECURITY DEFINER function: deep-copy a shared program server-side
--    This bypasses all RLS issues — runs as the database owner
CREATE OR REPLACE FUNCTION public.accept_share_and_copy(
  p_program_id UUID,
  p_recipient_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share         RECORD;
  v_source        RECORD;
  v_owner_name    TEXT;
  v_new_prog_id   UUID;
  v_new_sess_id   UUID;
  v_session       RECORD;
  v_exercise      RECORD;
  v_lifts         JSONB;
  v_ex_name_lower TEXT;
  v_profile_orm   NUMERIC;
BEGIN
  -- Load the share row
  SELECT * INTO v_share
  FROM program_shares
  WHERE program_id = p_program_id AND shared_with = p_recipient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share row not found';
  END IF;

  -- Load the source program
  SELECT * INTO v_source FROM programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source program not found';
  END IF;

  -- Get owner display name
  SELECT COALESCE(username, email, '—') INTO v_owner_name
  FROM profiles WHERE id = v_source.user_id;

  -- Get recipient's saved main lifts 1RM from their profile
  SELECT COALESCE(main_lifts_1rm, '{}') INTO v_lifts
  FROM profiles WHERE id = p_recipient_id;

  -- Insert the program copy owned by the recipient
  INSERT INTO programs (
    user_id, name, description, goal,
    total_weeks, start_rpe, current_index, current_week,
    active, shared_from, shared_from_name
  )
  VALUES (
    p_recipient_id,
    v_source.name,
    COALESCE(v_source.description, ''),
    COALESCE(v_source.goal, 'peaking'),
    COALESCE(v_source.total_weeks, 8),
    COALESCE(v_source.start_rpe, 7),
    COALESCE(v_source.current_index, 0),
    COALESCE(v_source.current_week, 1),
    false,
    v_source.user_id,
    COALESCE(v_owner_name, '—')
  )
  RETURNING id INTO v_new_prog_id;

  -- Copy each session + its exercises
  FOR v_session IN
    SELECT * FROM sessions WHERE program_id = p_program_id ORDER BY position
  LOOP
    INSERT INTO sessions (program_id, name, position)
    VALUES (v_new_prog_id, v_session.name, v_session.position)
    RETURNING id INTO v_new_sess_id;

    FOR v_exercise IN
      SELECT * FROM exercises WHERE session_id = v_session.id ORDER BY position
    LOOP
      -- Resolve 1RM: use recipient's profile value if it matches a main lift,
      -- otherwise keep the source exercise value (0 / whatever the owner had)
      v_ex_name_lower := lower(v_exercise.name);
      v_profile_orm := NULL;

      IF v_ex_name_lower LIKE '%deadlift%' THEN
        v_profile_orm := (v_lifts->>'deadlift')::NUMERIC;
      ELSIF v_ex_name_lower LIKE '%bench%' THEN
        v_profile_orm := (v_lifts->>'bench')::NUMERIC;
      ELSIF v_ex_name_lower LIKE '%squat%' THEN
        v_profile_orm := (v_lifts->>'squat')::NUMERIC;
      ELSIF v_ex_name_lower LIKE '%overhead%' OR v_ex_name_lower LIKE '%ohp%'
            OR (v_ex_name_lower LIKE '%press%' AND v_ex_name_lower NOT LIKE '%bench%') THEN
        v_profile_orm := (v_lifts->>'ohp')::NUMERIC;
      END IF;

      INSERT INTO exercises (
        session_id, name, sets, target_reps, target_rpe,
        start_rpe, one_rep_max, position
      )
      VALUES (
        v_new_sess_id,
        v_exercise.name,
        COALESCE(v_exercise.sets, 3),
        COALESCE(v_exercise.target_reps, 5),
        COALESCE(v_exercise.target_rpe, 7),
        COALESCE(v_exercise.start_rpe, 7),
        COALESCE(v_profile_orm, v_exercise.one_rep_max, 0),
        COALESCE(v_exercise.position, 0)
      );
    END LOOP;
  END LOOP;

  -- Mark share as accepted and store the copy ID
  UPDATE program_shares
  SET status = 'accepted', copy_program_id = v_new_prog_id
  WHERE program_id = p_program_id AND shared_with = p_recipient_id;

  RETURN v_new_prog_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_share_and_copy(UUID, UUID) TO authenticated;
