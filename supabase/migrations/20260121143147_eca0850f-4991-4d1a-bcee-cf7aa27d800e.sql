-- Fix security issues:
-- 1. Make course-documents and course-videos buckets private
-- 2. Add RLS policies for storage to allow enrolled users to access materials
-- 3. Create a public courses view without created_by field

-- 1. Make course content buckets private (keep thumbnails public for browsing)
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('course-documents', 'course-videos');

-- 2. Drop existing permissive SELECT policies on these buckets if they exist
DROP POLICY IF EXISTS "Public course documents access" ON storage.objects;
DROP POLICY IF EXISTS "Public course videos access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view course documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view course videos" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users can access course documents" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users can access course videos" ON storage.objects;

-- 3. Create RLS policies for authenticated users to access course materials
-- Only enrolled users can access course documents
CREATE POLICY "Enrolled users can access course documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-documents' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.user_id = auth.uid()
    AND c.document_url LIKE '%' || name
  )
);

-- Only enrolled users can access course videos  
CREATE POLICY "Enrolled users can access course videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-videos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.user_id = auth.uid()
    AND c.video_url LIKE '%' || name
  )
);

-- Admins can also access all course materials
CREATE POLICY "Admins can access all course documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can access all course videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Create a public view for courses that excludes sensitive created_by field
DROP VIEW IF EXISTS public.courses_public;
CREATE VIEW public.courses_public
WITH (security_invoker = on) AS
SELECT 
  id,
  title,
  description,
  category,
  course_type,
  course_url,
  duration_hours,
  is_published,
  created_at,
  updated_at,
  thumbnail_url,
  instructor_name,
  video_url,
  document_url
FROM public.courses
WHERE is_published = true;

-- Grant access to the view
GRANT SELECT ON public.courses_public TO authenticated;
GRANT SELECT ON public.courses_public TO anon;