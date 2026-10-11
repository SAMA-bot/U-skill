-- Lesson progress is now written only through validated server-side functions.
CREATE OR REPLACE FUNCTION public.start_lesson(p_lesson_id uuid)
RETURNS public.lesson_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.lesson_progress;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.learning_modules m ON m.id = l.module_id
    JOIN public.learning_paths p ON p.id = m.path_id
    WHERE l.id = p_lesson_id
      AND (p.is_published OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'hod'))
  ) THEN RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, status, xp_earned)
  VALUES (v_uid, p_lesson_id, 'in_progress', 0)
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  SELECT * INTO v_row FROM public.lesson_progress WHERE user_id = v_uid AND lesson_id = p_lesson_id;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id uuid)
RETURNS public.lesson_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.lesson_progress;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.learning_modules m ON m.id = l.module_id
    JOIN public.learning_paths p ON p.id = m.path_id
    WHERE l.id = p_lesson_id
      AND (p.is_published OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'hod'))
  ) THEN RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002'; END IF;

  -- Idempotent: an already-completed row is left untouched; XP comes from triggers
  -- using lessons.xp_reward and is de-duplicated by xp_events_unique_source.
  INSERT INTO public.lesson_progress (user_id, lesson_id, status, completed_at, xp_earned)
  VALUES (v_uid, p_lesson_id, 'completed', now(), 0)
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = 'completed', completed_at = COALESCE(public.lesson_progress.completed_at, now()), updated_at = now()
    WHERE public.lesson_progress.status IS DISTINCT FROM 'completed';

  SELECT * INTO v_row FROM public.lesson_progress WHERE user_id = v_uid AND lesson_id = p_lesson_id;
  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.start_lesson(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_lesson(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lesson(uuid) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.lesson_progress FROM authenticated, anon;
COMMENT ON POLICY "Users can insert their own progress" ON public.lesson_progress IS 'DEPRECATED: writes go through start_lesson/complete_lesson';
COMMENT ON POLICY "Users can update their own progress" ON public.lesson_progress IS 'DEPRECATED: writes go through start_lesson/complete_lesson';

-- Course enrollments: users may only create a fresh enrollment; status/progress/completion
-- changes happen in the course-actions function (service role).
CREATE OR REPLACE FUNCTION public.sanitize_client_enrollment_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    NEW.status := 'enrolled';
    NEW.progress_percentage := 0;
    NEW.completed_at := NULL;
    NEW.enrolled_at := now();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sanitize_client_enrollment_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER sanitize_client_enrollment_insert_trg
BEFORE INSERT ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.sanitize_client_enrollment_insert();

REVOKE UPDATE, DELETE ON public.course_enrollments FROM authenticated, anon;
COMMENT ON POLICY "Users can update their own enrollments" ON public.course_enrollments IS 'DEPRECATED: updates go through the course-actions function';