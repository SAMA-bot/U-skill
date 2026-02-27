
-- Create self-assessments table for faculty self-evaluation
CREATE TABLE public.self_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  academic_year TEXT NOT NULL,
  teaching_rating INTEGER NOT NULL CHECK (teaching_rating BETWEEN 1 AND 5),
  research_rating INTEGER NOT NULL CHECK (research_rating BETWEEN 1 AND 5),
  service_rating INTEGER NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
  strengths TEXT,
  weaknesses TEXT,
  goals TEXT,
  additional_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, academic_year)
);

-- Enable RLS
ALTER TABLE public.self_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assessments
CREATE POLICY "Users can view their own self-assessments"
ON public.self_assessments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own assessments
CREATE POLICY "Users can insert their own self-assessments"
ON public.self_assessments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own assessments
CREATE POLICY "Users can update their own self-assessments"
ON public.self_assessments
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all assessments
CREATE POLICY "Admins can view all self-assessments"
ON public.self_assessments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_self_assessments_updated_at
BEFORE UPDATE ON public.self_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
