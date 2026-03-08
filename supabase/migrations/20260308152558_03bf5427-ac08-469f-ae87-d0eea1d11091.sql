
-- Fix courses_public view - drop and recreate with correct column order and WHERE filter
DROP VIEW IF EXISTS public.courses_public;
CREATE VIEW public.courses_public AS
SELECT
  id, duration_hours, is_published, created_at, updated_at,
  title, description, category, course_type, course_url,
  thumbnail_url, instructor_name, video_url, document_url
FROM public.courses
WHERE is_published = true;
