-- Create courses table for capacity building module
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  duration_hours INTEGER,
  instructor_name TEXT,
  thumbnail_url TEXT,
  course_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all courses"
ON public.courses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view published courses
CREATE POLICY "Users can view published courses"
ON public.courses
FOR SELECT
USING (is_published = true);

-- Add trigger for updated_at
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for course thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails', 'course-thumbnails', true);

-- Storage policies for course thumbnails
CREATE POLICY "Admins can upload course thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'course-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update course thumbnails"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'course-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete course thumbnails"
ON storage.objects
FOR DELETE
USING (bucket_id = 'course-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view course thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'course-thumbnails');