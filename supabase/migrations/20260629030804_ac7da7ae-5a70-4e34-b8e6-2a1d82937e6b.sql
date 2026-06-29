
-- 1. achievement_badges: remove self-insert
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.achievement_badges;

-- 2. xp_earned trigger: use authoritative lesson reward
CREATE OR REPLACE FUNCTION public.award_xp_on_lesson_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_xp int;
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT COALESCE(xp_reward, 0) INTO v_xp FROM public.lessons WHERE id = NEW.lesson_id;
    IF v_xp > 0 THEN
      INSERT INTO public.xp_events(user_id, source_type, source_id, xp_amount, description)
      VALUES (NEW.user_id, 'lesson', NEW.lesson_id, v_xp, 'Lesson completed')
      ON CONFLICT ON CONSTRAINT xp_events_unique_source DO NOTHING;
    END IF;
    -- Force xp_earned to authoritative value
    NEW.xp_earned := v_xp;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. is_hod_of_user: ensure target also has non-null department
CREATE OR REPLACE FUNCTION public.is_hod_of_user(_target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles hod_profile
    JOIN public.profiles target_profile
      ON target_profile.department = hod_profile.department
    JOIN public.user_roles ur
      ON ur.user_id = hod_profile.user_id AND ur.role = 'hod'
    WHERE hod_profile.user_id = auth.uid()
      AND target_profile.user_id = _target_user_id
      AND hod_profile.department IS NOT NULL
      AND target_profile.department IS NOT NULL
      AND _target_user_id <> auth.uid()
  )
$$;

-- 4. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.audit_course_completion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_course_management() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_document_soft_delete() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_profile_changes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_role_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_points_on_course_completion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_course_completion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_lesson_completion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_streak_milestone() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, uuid, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_badge_check_on_course_completion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_badge_check_on_streak_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_metrics_on_activity_completion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_metrics_on_activity_insert() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM anon, authenticated, PUBLIC;
-- Keep EXECUTE for has_role, is_hod_of_user (used in RLS), auto_award_badges (called via RPC), update_updated_at_column (trigger)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- 5. Public bucket listing: drop broad SELECT policies. Public URLs continue to work.
DROP POLICY IF EXISTS "Anyone can view course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;

-- 6. faculty-documents storage: add owner DELETE/UPDATE
CREATE POLICY "Users can delete their own faculty documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'faculty-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own faculty documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'faculty-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete faculty documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'faculty-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 7. realtime.messages RLS: restrict topic subscriptions to own user id
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to own xp topic" ON realtime.messages;
CREATE POLICY "Users can subscribe to own xp topic"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'xp:' || auth.uid()::text
  OR realtime.topic() = auth.uid()::text
);
