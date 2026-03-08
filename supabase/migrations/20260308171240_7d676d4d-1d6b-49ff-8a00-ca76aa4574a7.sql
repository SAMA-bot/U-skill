DROP VIEW IF EXISTS public.courses_public;

CREATE VIEW public.courses_public
WITH (security_invoker = true)
AS
SELECT
  id,
  title,
  description,
  category,
  duration_hours,
  instructor_name,
  thumbnail_url,
  course_url,
  video_url,
  document_url,
  course_type,
  content_type,
  is_published,
  created_at,
  updated_at
FROM public.courses
WHERE is_published = true;