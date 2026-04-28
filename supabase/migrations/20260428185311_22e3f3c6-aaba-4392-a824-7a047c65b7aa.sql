-- 1. Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. Prevent users from directly updating score columns via a trigger
CREATE OR REPLACE FUNCTION public.prevent_score_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Allow updates from SECURITY DEFINER functions (no JWT role check there)
  -- Block direct updates by authenticated users to score-related columns
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF NEW.total_score IS DISTINCT FROM OLD.total_score
       OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
       OR NEW.best_streak IS DISTINCT FROM OLD.best_streak
       OR NEW.rank_index IS DISTINCT FROM OLD.rank_index THEN
      RAISE EXCEPTION 'Score, streak, and rank fields can only be updated via award_points()';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_score_tampering_trigger ON public.profiles;
CREATE TRIGGER prevent_score_tampering_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_score_tampering();

-- 3. Server-side award_points RPC with clamping
CREATE OR REPLACE FUNCTION public.award_points(p_points integer)
RETURNS TABLE(total_score integer, current_streak integer, best_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pts integer;
  v_new_streak integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clamp points to a sane per-call max
  v_pts := GREATEST(0, LEAST(COALESCE(p_points, 0), 100));

  UPDATE public.profiles p
  SET
    total_score = p.total_score + v_pts,
    current_streak = CASE WHEN v_pts > 0 THEN p.current_streak + 1 ELSE 0 END,
    best_streak = GREATEST(
      p.best_streak,
      CASE WHEN v_pts > 0 THEN p.current_streak + 1 ELSE 0 END
    ),
    updated_at = now()
  WHERE p.id = v_uid;

  RETURN QUERY
    SELECT p.total_score, p.current_streak, p.best_streak
    FROM public.profiles p WHERE p.id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.award_points(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.award_points(integer) TO authenticated;

-- 4. Lock down internal trigger functions (handle_new_user, set_updated_at, prevent_score_tampering)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_score_tampering() FROM public, anon, authenticated;