ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS estimated_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_audience text;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 15;

CREATE OR REPLACE FUNCTION public.validate_path_difficulty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.difficulty NOT IN ('beginner','intermediate','advanced') THEN
    RAISE EXCEPTION 'difficulty must be beginner, intermediate or advanced';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_path_difficulty_trg ON public.learning_paths;
CREATE TRIGGER validate_path_difficulty_trg
  BEFORE INSERT OR UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.validate_path_difficulty();

CREATE POLICY "HODs can manage learning paths"
  ON public.learning_paths FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hod'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'hod'::app_role));

CREATE POLICY "HODs can manage modules"
  ON public.learning_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hod'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'hod'::app_role));

CREATE POLICY "HODs can manage lessons"
  ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hod'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'hod'::app_role));

CREATE POLICY "HODs can manage lesson content"
  ON public.lesson_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hod'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'hod'::app_role));