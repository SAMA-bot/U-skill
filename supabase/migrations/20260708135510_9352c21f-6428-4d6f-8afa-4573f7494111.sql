
-- 1) xp_earned self-injection: force server value via BEFORE trigger, and split RLS so
--    user writes must set xp_earned = 0; trigger overwrites with authoritative value.
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.lesson_progress;

CREATE POLICY "Users can view their own progress"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND xp_earned = 0);

CREATE POLICY "Users can update their own progress"
  ON public.lesson_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND xp_earned = 0);

CREATE POLICY "Users can delete their own progress"
  ON public.lesson_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Ensure trigger runs BEFORE so NEW.xp_earned assignment takes effect
DROP TRIGGER IF EXISTS award_xp_on_lesson_completion_trg ON public.lesson_progress;
CREATE TRIGGER award_xp_on_lesson_completion_trg
  BEFORE INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_lesson_completion();

-- 2) HOD self-scope risk: prevent non-admins from changing their department
CREATE OR REPLACE FUNCTION public.prevent_department_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.department IS DISTINCT FROM OLD.department
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change the department field';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_department_self_edit_trg ON public.profiles;
CREATE TRIGGER prevent_department_self_edit_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_department_self_edit();

-- 3) faculty-documents storage: verify ownership via join to faculty_documents
DROP POLICY IF EXISTS "Users can update their own faculty documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own faculty documents" ON storage.objects;

CREATE POLICY "Users can update their own faculty documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'faculty-documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.faculty_documents fd
      WHERE fd.document_url = storage.objects.name
        AND fd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own faculty documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'faculty-documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.faculty_documents fd
      WHERE fd.document_url = storage.objects.name
        AND fd.user_id = auth.uid()
    )
  );

-- 4) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
--    These are triggers or admin/service-role callers only. Keep has_role, is_hod_of_user,
--    and auto_award_badges executable (used in RLS or client RPC).
REVOKE EXECUTE ON FUNCTION public.audit_course_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_profile_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_role_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_document_soft_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_course_management() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_lesson_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_course_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_streak_milestone() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_points_on_course_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_badge_check_on_streak_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_badge_check_on_course_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_metrics_on_activity_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_metrics_on_activity_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, uuid, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_department_self_edit() FROM anon, authenticated;
