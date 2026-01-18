-- Create storage bucket for course documents (PDFs, Word, Text files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-documents', 'course-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for course videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for course-documents bucket
CREATE POLICY "Admins can upload course documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update course documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete course documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Anyone can view course documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-documents');

-- RLS policies for course-videos bucket
CREATE POLICY "Admins can upload course videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update course videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete course videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Anyone can view course videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-videos');

-- Add document_url column to courses table for storing uploaded document path
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Update the award_points_on_course_completion function to use duration-based scoring
CREATE OR REPLACE FUNCTION public.award_points_on_course_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  course_record RECORD;
  current_month TEXT;
  current_year INT;
  current_week INT;
  skill_to_update TEXT;
  score_increment INT;
  existing_metric_id UUID;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    
    -- Get the course details
    SELECT * INTO course_record FROM public.courses WHERE id = NEW.course_id;
    
    IF course_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate score based on duration (5 points per hour, min 10, max 50)
    IF course_record.duration_hours IS NOT NULL AND course_record.duration_hours > 0 THEN
      score_increment := LEAST(GREATEST(course_record.duration_hours * 5, 10), 50);
    ELSE
      score_increment := 10; -- Default for courses without duration
    END IF;
    
    -- Determine skill based on course category
    CASE course_record.category
      WHEN 'teaching' THEN skill_to_update := 'Teaching Excellence';
      WHEN 'research' THEN skill_to_update := 'Research Skills';
      WHEN 'technology' THEN skill_to_update := 'Technology Proficiency';
      WHEN 'leadership' THEN skill_to_update := 'Leadership';
      WHEN 'communication' THEN skill_to_update := 'Communication';
      ELSE skill_to_update := 'Professional Development';
    END CASE;
    
    -- Get current date info
    current_month := TO_CHAR(NOW(), 'Month');
    current_year := EXTRACT(YEAR FROM NOW())::INT;
    current_week := EXTRACT(WEEK FROM NOW())::INT;
    
    -- Update or insert capacity_skills
    INSERT INTO public.capacity_skills (user_id, skill_name, current_level, target_level)
    VALUES (NEW.user_id, skill_to_update, score_increment, 100)
    ON CONFLICT (user_id, skill_name) DO UPDATE
    SET current_level = LEAST(capacity_skills.current_level + score_increment, 100),
        updated_at = NOW();
    
    -- Update or insert performance_metrics based on category
    SELECT id INTO existing_metric_id
    FROM public.performance_metrics
    WHERE user_id = NEW.user_id AND month = current_month AND year = current_year;
    
    IF existing_metric_id IS NOT NULL THEN
      UPDATE public.performance_metrics
      SET 
        teaching_score = CASE WHEN course_record.category = 'teaching' THEN LEAST(teaching_score + score_increment, 100) ELSE teaching_score END,
        research_score = CASE WHEN course_record.category = 'research' THEN LEAST(research_score + score_increment, 100) ELSE research_score END,
        service_score = CASE WHEN course_record.category NOT IN ('teaching', 'research') THEN LEAST(service_score + score_increment, 100) ELSE service_score END
      WHERE id = existing_metric_id;
    ELSE
      INSERT INTO public.performance_metrics (user_id, month, year, teaching_score, research_score, service_score)
      VALUES (
        NEW.user_id,
        current_month,
        current_year,
        CASE WHEN course_record.category = 'teaching' THEN score_increment ELSE 0 END,
        CASE WHEN course_record.category = 'research' THEN score_increment ELSE 0 END,
        CASE WHEN course_record.category NOT IN ('teaching', 'research') THEN score_increment ELSE 0 END
      );
    END IF;
    
    -- Update or insert motivation_scores
    INSERT INTO public.motivation_scores (user_id, week_number, year, motivation_index, engagement_score)
    VALUES (NEW.user_id, current_week, current_year, score_increment, score_increment)
    ON CONFLICT (user_id, week_number, year) DO UPDATE
    SET 
      motivation_index = LEAST(motivation_scores.motivation_index + score_increment, 100),
      engagement_score = LEAST(motivation_scores.engagement_score + score_increment, 100);
  END IF;
  
  RETURN NEW;
END;
$$;