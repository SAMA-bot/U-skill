-- Create a function to update user metrics when an activity is completed
CREATE OR REPLACE FUNCTION public.update_metrics_on_activity_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month TEXT;
  current_year INT;
  current_week INT;
  skill_to_update TEXT;
  score_increment INT;
  existing_metric_id UUID;
BEGIN
  -- Only process when activity status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get current date info
    current_month := to_char(NOW(), 'Mon');
    current_year := EXTRACT(YEAR FROM NOW())::INT;
    current_week := EXTRACT(WEEK FROM NOW())::INT;
    
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    
    -- Determine which skill to update based on activity_type
    CASE NEW.activity_type
      WHEN 'teaching' THEN skill_to_update := 'Teaching';
      WHEN 'research' THEN skill_to_update := 'Research';
      WHEN 'workshop' THEN skill_to_update := 'Leadership';
      WHEN 'conference' THEN skill_to_update := 'Communication';
      WHEN 'publication' THEN skill_to_update := 'Research';
      WHEN 'mentoring' THEN skill_to_update := 'Mentoring';
      WHEN 'technology' THEN skill_to_update := 'Technology';
      WHEN 'service' THEN skill_to_update := 'Leadership';
      ELSE skill_to_update := 'Teaching';
    END CASE;
    
    -- Random score increment between 5-15
    score_increment := floor(random() * 11 + 5)::INT;
    
    -- Update capacity skills (cap at 100)
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
      -- Create new performance metric entry
      INSERT INTO public.performance_metrics (
        user_id, month, year, teaching_score, research_score, service_score
      ) VALUES (
        NEW.user_id,
        current_month,
        current_year,
        CASE WHEN NEW.activity_type IN ('teaching', 'mentoring') THEN score_increment ELSE 0 END,
        CASE WHEN NEW.activity_type IN ('research', 'publication', 'conference') THEN score_increment ELSE 0 END,
        CASE WHEN NEW.activity_type IN ('workshop', 'service', 'technology') THEN score_increment ELSE 0 END
      );
    ELSE
      -- Update existing performance metric (cap at 100)
      UPDATE public.performance_metrics
      SET 
        teaching_score = LEAST(COALESCE(teaching_score, 0) + 
          CASE WHEN NEW.activity_type IN ('teaching', 'mentoring') THEN score_increment ELSE 0 END, 100),
        research_score = LEAST(COALESCE(research_score, 0) + 
          CASE WHEN NEW.activity_type IN ('research', 'publication', 'conference') THEN score_increment ELSE 0 END, 100),
        service_score = LEAST(COALESCE(service_score, 0) + 
          CASE WHEN NEW.activity_type IN ('workshop', 'service', 'technology') THEN score_increment ELSE 0 END, 100)
      WHERE id = existing_metric_id;
    END IF;
    
    -- Update or create motivation score for current week
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_activity_completion ON public.activities;

-- Create the trigger
CREATE TRIGGER on_activity_completion
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_metrics_on_activity_completion();

-- Also trigger on insert if status is already completed
CREATE OR REPLACE FUNCTION public.update_metrics_on_activity_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month TEXT;
  current_year INT;
  current_week INT;
  skill_to_update TEXT;
  score_increment INT;
  existing_metric_id UUID;
BEGIN
  -- Only process if activity is inserted with 'completed' status
  IF NEW.status = 'completed' THEN
    -- Get current date info
    current_month := to_char(NOW(), 'Mon');
    current_year := EXTRACT(YEAR FROM NOW())::INT;
    current_week := EXTRACT(WEEK FROM NOW())::INT;
    
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    
    -- Determine which skill to update based on activity_type
    CASE NEW.activity_type
      WHEN 'teaching' THEN skill_to_update := 'Teaching';
      WHEN 'research' THEN skill_to_update := 'Research';
      WHEN 'workshop' THEN skill_to_update := 'Leadership';
      WHEN 'conference' THEN skill_to_update := 'Communication';
      WHEN 'publication' THEN skill_to_update := 'Research';
      WHEN 'mentoring' THEN skill_to_update := 'Mentoring';
      WHEN 'technology' THEN skill_to_update := 'Technology';
      WHEN 'service' THEN skill_to_update := 'Leadership';
      ELSE skill_to_update := 'Teaching';
    END CASE;
    
    -- Random score increment between 5-15
    score_increment := floor(random() * 11 + 5)::INT;
    
    -- Update capacity skills (cap at 100)
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
      -- Create new performance metric entry
      INSERT INTO public.performance_metrics (
        user_id, month, year, teaching_score, research_score, service_score
      ) VALUES (
        NEW.user_id,
        current_month,
        current_year,
        CASE WHEN NEW.activity_type IN ('teaching', 'mentoring') THEN score_increment ELSE 0 END,
        CASE WHEN NEW.activity_type IN ('research', 'publication', 'conference') THEN score_increment ELSE 0 END,
        CASE WHEN NEW.activity_type IN ('workshop', 'service', 'technology') THEN score_increment ELSE 0 END
      );
    ELSE
      -- Update existing performance metric (cap at 100)
      UPDATE public.performance_metrics
      SET 
        teaching_score = LEAST(COALESCE(teaching_score, 0) + 
          CASE WHEN NEW.activity_type IN ('teaching', 'mentoring') THEN score_increment ELSE 0 END, 100),
        research_score = LEAST(COALESCE(research_score, 0) + 
          CASE WHEN NEW.activity_type IN ('research', 'publication', 'conference') THEN score_increment ELSE 0 END, 100),
        service_score = LEAST(COALESCE(service_score, 0) + 
          CASE WHEN NEW.activity_type IN ('workshop', 'service', 'technology') THEN score_increment ELSE 0 END, 100)
      WHERE id = existing_metric_id;
    END IF;
    
    -- Update or create motivation score for current week
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

-- Drop existing insert trigger if exists
DROP TRIGGER IF EXISTS on_activity_insert ON public.activities;

-- Create the insert trigger
CREATE TRIGGER on_activity_insert
  BEFORE INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_metrics_on_activity_insert();

-- Add unique constraint on motivation_scores for upsert to work
ALTER TABLE public.motivation_scores 
DROP CONSTRAINT IF EXISTS motivation_scores_user_week_year_unique;

ALTER TABLE public.motivation_scores 
ADD CONSTRAINT motivation_scores_user_week_year_unique 
UNIQUE (user_id, week_number, year);