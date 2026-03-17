ALTER TABLE public.courses ADD COLUMN tags text[] DEFAULT '{}'::text[];

-- Update the courses_public view to include tags
CREATE OR REPLACE VIEW public.courses_public AS
SELECT id, title, description, category, duration_hours, instructor_name, thumbnail_url, course_url, video_url, document_url, course_type, content_type, is_published, created_at, updated_at, tags
FROM public.courses
WHERE is_published = true;