-- Add course_type column to courses table
ALTER TABLE public.courses 
ADD COLUMN course_type text NOT NULL DEFAULT 'regular';

-- Add video_url column for video courses
ALTER TABLE public.courses 
ADD COLUMN video_url text;

-- Add index for course_type for better filtering
CREATE INDEX idx_courses_course_type ON public.courses(course_type);