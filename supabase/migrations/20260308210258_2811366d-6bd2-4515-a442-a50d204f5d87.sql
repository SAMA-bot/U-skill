
-- Helper function: check if current user is HOD of the same department as target user
CREATE OR REPLACE FUNCTION public.is_hod_of_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles hod_profile
    JOIN public.profiles target_profile ON target_profile.department = hod_profile.department
    JOIN public.user_roles ur ON ur.user_id = hod_profile.user_id AND ur.role = 'hod'
    WHERE hod_profile.user_id = auth.uid()
      AND target_profile.user_id = _target_user_id
      AND hod_profile.department IS NOT NULL
  )
$$;

-- HOD can view profiles in their department
CREATE POLICY "HODs can view department profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));

-- HOD can view department faculty documents
CREATE POLICY "HODs can view department documents"
ON public.faculty_documents FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));

-- HOD can update (approve/reject) department faculty documents
CREATE POLICY "HODs can update department documents"
ON public.faculty_documents FOR UPDATE TO authenticated
USING (public.is_hod_of_user(user_id));

-- HOD can view department performance metrics
CREATE POLICY "HODs can view department metrics"
ON public.performance_metrics FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));

-- HOD can view department capacity skills
CREATE POLICY "HODs can view department skills"
ON public.capacity_skills FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));

-- HOD can view department motivation scores
CREATE POLICY "HODs can view department motivation"
ON public.motivation_scores FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));

-- HOD can view department faculty feedback
CREATE POLICY "HODs can view department feedback"
ON public.faculty_feedback FOR SELECT TO authenticated
USING (public.is_hod_of_user(faculty_id));

-- HOD can submit feedback for department faculty
CREATE POLICY "HODs can submit department feedback"
ON public.faculty_feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reviewer_id AND public.is_hod_of_user(faculty_id));

-- HOD can view department course enrollments
CREATE POLICY "HODs can view department enrollments"
ON public.course_enrollments FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));

-- HOD can view department activities
CREATE POLICY "HODs can view department activities"
ON public.activities FOR SELECT TO authenticated
USING (public.is_hod_of_user(user_id));
