
-- Add cooldown column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_points_awarded_at timestamptz;

-- Replace award_points with cooldown enforcement
CREATE OR REPLACE FUNCTION public.award_points(p_points integer)
 RETURNS TABLE(total_score integer, current_streak integer, best_streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_pts integer;
  v_last timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_pts := GREATEST(0, LEAST(COALESCE(p_points, 0), 100));

  SELECT p.last_points_awarded_at INTO v_last FROM public.profiles p WHERE p.id = v_uid;
  IF v_last IS NOT NULL AND v_last > now() - interval '2 seconds' THEN
    RAISE EXCEPTION 'Points awarded too quickly. Please wait before earning more.';
  END IF;

  UPDATE public.profiles p
  SET
    total_score = p.total_score + v_pts,
    current_streak = CASE WHEN v_pts > 0 THEN p.current_streak + 1 ELSE 0 END,
    best_streak = GREATEST(
      p.best_streak,
      CASE WHEN v_pts > 0 THEN p.current_streak + 1 ELSE 0 END
    ),
    last_points_awarded_at = now(),
    updated_at = now()
  WHERE p.id = v_uid;

  RETURN QUERY
    SELECT p.total_score, p.current_streak, p.best_streak
    FROM public.profiles p WHERE p.id = v_uid;
END;
$function$;

-- Tighten profiles UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
