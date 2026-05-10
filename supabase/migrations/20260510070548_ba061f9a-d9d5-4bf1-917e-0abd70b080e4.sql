
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  xp_amount integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT xp_events_unique_source UNIQUE (user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON public.xp_events(user_id);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own xp events" ON public.xp_events;
CREATE POLICY "Users can view their own xp events"
ON public.xp_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all xp events" ON public.xp_events;
CREATE POLICY "Admins can view all xp events"
ON public.xp_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.award_xp_on_lesson_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND COALESCE(NEW.xp_earned, 0) > 0 THEN
    INSERT INTO public.xp_events(user_id, source_type, source_id, xp_amount, description)
    VALUES (NEW.user_id, 'lesson', NEW.lesson_id, NEW.xp_earned, 'Lesson completed')
    ON CONFLICT ON CONSTRAINT xp_events_unique_source DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_xp_on_lesson ON public.lesson_progress;
CREATE TRIGGER award_xp_on_lesson
AFTER INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_lesson_completion();

CREATE OR REPLACE FUNCTION public.award_xp_on_course_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hours int;
  ctitle text;
  xp_amount int;
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT COALESCE(duration_hours, 1), title INTO hours, ctitle
      FROM public.courses WHERE id = NEW.course_id;
    xp_amount := GREATEST(50, COALESCE(hours, 1) * 25);
    INSERT INTO public.xp_events(user_id, source_type, source_id, xp_amount, description)
    VALUES (NEW.user_id, 'course', NEW.course_id, xp_amount, 'Course completed: ' || COALESCE(ctitle, ''))
    ON CONFLICT ON CONSTRAINT xp_events_unique_source DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_xp_on_course ON public.course_enrollments;
CREATE TRIGGER award_xp_on_course
AFTER INSERT OR UPDATE ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_course_completion();

CREATE OR REPLACE FUNCTION public.award_xp_on_streak_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bonus int;
  milestone int;
  synthetic_id uuid;
BEGIN
  IF NEW.streak_type = 'daily_login' THEN
    milestone := CASE
      WHEN NEW.current_streak >= 30 AND COALESCE(OLD.current_streak,0) < 30 THEN 30
      WHEN NEW.current_streak >= 15 AND COALESCE(OLD.current_streak,0) < 15 THEN 15
      WHEN NEW.current_streak >= 7  AND COALESCE(OLD.current_streak,0) < 7  THEN 7
      WHEN NEW.current_streak >= 3  AND COALESCE(OLD.current_streak,0) < 3  THEN 3
      ELSE 0
    END;
    IF milestone > 0 THEN
      bonus := CASE milestone WHEN 3 THEN 25 WHEN 7 THEN 75 WHEN 15 THEN 150 WHEN 30 THEN 300 END;
      synthetic_id := md5(NEW.user_id::text || '-streak-' || milestone)::uuid;
      INSERT INTO public.xp_events(user_id, source_type, source_id, xp_amount, description)
      VALUES (NEW.user_id, 'streak', synthetic_id, bonus, milestone || '-day streak bonus')
      ON CONFLICT ON CONSTRAINT xp_events_unique_source DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_xp_on_streak ON public.user_streaks;
CREATE TRIGGER award_xp_on_streak
AFTER INSERT OR UPDATE ON public.user_streaks
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_streak_milestone();

INSERT INTO public.xp_events(user_id, source_type, source_id, xp_amount, description)
SELECT user_id, 'lesson', lesson_id, xp_earned, 'Lesson completed (backfill)'
FROM public.lesson_progress
WHERE status = 'completed' AND COALESCE(xp_earned,0) > 0
ON CONFLICT ON CONSTRAINT xp_events_unique_source DO NOTHING;

INSERT INTO public.xp_events(user_id, source_type, source_id, xp_amount, description)
SELECT ce.user_id, 'course', ce.course_id,
       GREATEST(50, COALESCE(c.duration_hours,1) * 25),
       'Course completed (backfill): ' || COALESCE(c.title,'')
FROM public.course_enrollments ce
LEFT JOIN public.courses c ON c.id = ce.course_id
WHERE ce.status = 'completed'
ON CONFLICT ON CONSTRAINT xp_events_unique_source DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_events;
