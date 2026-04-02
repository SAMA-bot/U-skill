-- Fix 1: Add FK constraint on faculty_feedback.faculty_id
ALTER TABLE public.faculty_feedback
  ADD CONSTRAINT fk_faculty_feedback_faculty_id
  FOREIGN KEY (faculty_id) REFERENCES public.profiles(user_id);

-- Fix 2: Replace feedback policy to prevent self-feedback and validate faculty_id
DROP POLICY IF EXISTS "Users can submit feedback" ON public.faculty_feedback;
CREATE POLICY "Users can submit feedback"
  ON public.faculty_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND auth.uid() != faculty_id
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = faculty_id
    )
  );

-- Fix 3: Restrict published courses to authenticated users only
DROP POLICY IF EXISTS "Users can view published courses" ON public.courses;
CREATE POLICY "Authenticated users can view published courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Fix 4: Remove badge self-insert policy
DROP POLICY IF EXISTS "System can insert badges" ON public.achievement_badges;

-- Fix 5: Remove tables from Realtime publication (no IF EXISTS for ALTER PUBLICATION)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.activities;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.courses;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.course_enrollments;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Fix 6: Make avatars require auth
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');