
-- Create faculty_feedback table for ratings and comments
CREATE TABLE public.faculty_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faculty_feedback ENABLE ROW LEVEL SECURITY;

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.faculty_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Faculty can view feedback about themselves
CREATE POLICY "Faculty can view their own feedback"
  ON public.faculty_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = faculty_id);

-- Authenticated users can submit feedback
CREATE POLICY "Users can submit feedback"
  ON public.faculty_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
  ON public.faculty_feedback FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add some seed data for demo purposes (will be inserted separately)
CREATE INDEX idx_faculty_feedback_faculty_id ON public.faculty_feedback (faculty_id);
CREATE INDEX idx_faculty_feedback_created_at ON public.faculty_feedback (created_at);
