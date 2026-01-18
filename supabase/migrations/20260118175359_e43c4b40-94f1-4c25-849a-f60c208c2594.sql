-- Create course enrollments table to track user course progress
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view their own enrollments"
ON public.course_enrollments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can enroll themselves in courses
CREATE POLICY "Users can enroll in courses"
ON public.course_enrollments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments
CREATE POLICY "Users can update their own enrollments"
ON public.course_enrollments
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.course_enrollments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function to award points on course completion
CREATE OR REPLACE FUNCTION public.award_points_on_course_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  course_category TEXT;
  course_duration INT;
  skill_to_update TEXT;
  score_increment INT;
  current_month TEXT;
  current_year INT;
  current_week INT;
  existing_metric_id UUID;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    
    -- Get course details
    SELECT category, COALESCE(duration_hours, 1) INTO course_category, course_duration
    FROM public.courses WHERE id = NEW.course_id;
    
    -- Map course category to skill
    CASE course_category
      WHEN 'teaching' THEN skill_to_update := 'Teaching';
      WHEN 'research' THEN skill_to_update := 'Research';
      WHEN 'technology' THEN skill_to_update := 'Technology';
      WHEN 'leadership' THEN skill_to_update := 'Leadership';
      WHEN 'communication' THEN skill_to_update := 'Communication';
      ELSE skill_to_update := 'Teaching';
    END CASE;
    
    -- Calculate score based on course duration (more hours = more points)
    score_increment := GREATEST(10, LEAST(course_duration * 5, 25));
    
    -- Get current date info
    current_month := to_char(NOW(), 'Mon');
    current_year := EXTRACT(YEAR FROM NOW())::INT;
    current_week := EXTRACT(WEEK FROM NOW())::INT;
    
    -- Update capacity skills
    UPDATE public.capacity_skills
    SET current_level = LEAST(current_level + score_increment, 100),
        updated_at = NOW()
    WHERE user_id = NEW.user_id AND skill_name = skill_to_update;
    
    -- Check if performance metric exists for this month
    SELECT id INTO existing_metric_id
    FROM public.performance_metrics
    WHERE user_id = NEW.user_id 
      AND month = current_month 
      AND year = current_year;
    
    IF existing_metric_id IS NULL THEN
      INSERT INTO public.performance_metrics (
        user_id, month, year, teaching_score, research_score, service_score
      ) VALUES (
        NEW.user_id,
        current_month,
        current_year,
        CASE WHEN course_category IN ('teaching', 'communication') THEN score_increment ELSE 0 END,
        CASE WHEN course_category = 'research' THEN score_increment ELSE 0 END,
        CASE WHEN course_category IN ('technology', 'leadership', 'general') THEN score_increment ELSE 0 END
      );
    ELSE
      UPDATE public.performance_metrics
      SET 
        teaching_score = LEAST(COALESCE(teaching_score, 0) + 
          CASE WHEN course_category IN ('teaching', 'communication') THEN score_increment ELSE 0 END, 100),
        research_score = LEAST(COALESCE(research_score, 0) + 
          CASE WHEN course_category = 'research' THEN score_increment ELSE 0 END, 100),
        service_score = LEAST(COALESCE(service_score, 0) + 
          CASE WHEN course_category IN ('technology', 'leadership', 'general') THEN score_increment ELSE 0 END, 100)
      WHERE id = existing_metric_id;
    END IF;
    
    -- Update motivation score
    INSERT INTO public.motivation_scores (user_id, week_number, year, motivation_index, engagement_score)
    VALUES (NEW.user_id, current_week, current_year, score_increment, score_increment)
    ON CONFLICT (user_id, week_number, year) 
    DO UPDATE SET 
      motivation_index = LEAST(COALESCE(motivation_scores.motivation_index, 0) + score_increment, 100),
      engagement_score = LEAST(COALESCE(motivation_scores.engagement_score, 0) + score_increment, 100);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_course_completion
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_course_completion();

-- Enable realtime for course_enrollments
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_enrollments;