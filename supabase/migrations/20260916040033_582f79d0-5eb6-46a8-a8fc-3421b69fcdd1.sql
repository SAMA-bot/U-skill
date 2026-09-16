CREATE TABLE public.learning_path_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  current_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  lessons_completed integer NOT NULL DEFAULT 0,
  total_lessons integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_id)
);

GRANT SELECT ON public.learning_path_progress TO authenticated;
GRANT ALL ON public.learning_path_progress TO service_role;

ALTER TABLE public.learning_path_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own path progress"
ON public.learning_path_progress FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all path progress"
ON public.learning_path_progress FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department path progress"
ON public.learning_path_progress FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));

CREATE INDEX idx_lpp_user ON public.learning_path_progress(user_id);
CREATE INDEX idx_lpp_path ON public.learning_path_progress(path_id);

CREATE TRIGGER update_lpp_updated_at
BEFORE UPDATE ON public.learning_path_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_learning_path_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path_id uuid;
  v_total integer;
  v_done integer;
  v_xp integer;
  v_current uuid;
  v_status text;
  v_was_completed boolean;
BEGIN
  SELECT lm.path_id INTO v_path_id
  FROM public.lessons l
  JOIN public.learning_modules lm ON lm.id = l.module_id
  WHERE l.id = NEW.lesson_id;

  IF v_path_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.lessons l
  JOIN public.learning_modules lm ON lm.id = l.module_id
  WHERE lm.path_id = v_path_id;

  SELECT count(*), COALESCE(sum(lp.xp_earned), 0)
  INTO v_done, v_xp
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  JOIN public.learning_modules lm ON lm.id = l.module_id
  WHERE lm.path_id = v_path_id
    AND lp.user_id = NEW.user_id
    AND lp.status = 'completed';

  SELECT l.id INTO v_current
  FROM public.lessons l
  JOIN public.learning_modules lm ON lm.id = l.module_id
  LEFT JOIN public.lesson_progress lp
    ON lp.lesson_id = l.id AND lp.user_id = NEW.user_id AND lp.status = 'completed'
  WHERE lm.path_id = v_path_id AND lp.id IS NULL
  ORDER BY lm.sort_order, l.sort_order
  LIMIT 1;

  IF v_total > 0 AND v_done >= v_total THEN
    v_status := 'completed';
  ELSE
    v_status := 'in_progress';
  END IF;

  SELECT (status = 'completed') INTO v_was_completed
  FROM public.learning_path_progress
  WHERE user_id = NEW.user_id AND path_id = v_path_id;

  INSERT INTO public.learning_path_progress AS lpp
    (user_id, path_id, status, current_lesson_id, lessons_completed, total_lessons, xp_earned,
     last_activity_at, completed_at)
  VALUES
    (NEW.user_id, v_path_id, v_status, v_current, v_done, v_total, v_xp, now(),
     CASE WHEN v_status = 'completed' THEN now() ELSE NULL END)
  ON CONFLICT (user_id, path_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_lesson_id = EXCLUDED.current_lesson_id,
    lessons_completed = EXCLUDED.lessons_completed,
    total_lessons = EXCLUDED.total_lessons,
    xp_earned = EXCLUDED.xp_earned,
    last_activity_at = now(),
    completed_at = CASE WHEN EXCLUDED.status = 'completed'
                        THEN COALESCE(lpp.completed_at, now()) ELSE NULL END;

  IF v_status = 'completed' AND COALESCE(v_was_completed, false) = false THEN
    INSERT INTO public.xp_events (user_id, source_type, source_id, xp_amount, description)
    VALUES (NEW.user_id, 'learning_path_completion', v_path_id, 50, 'Completed a learning path')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_learning_path_progress() FROM anon, authenticated;

CREATE TRIGGER sync_path_progress_on_lesson_progress
AFTER INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.sync_learning_path_progress();