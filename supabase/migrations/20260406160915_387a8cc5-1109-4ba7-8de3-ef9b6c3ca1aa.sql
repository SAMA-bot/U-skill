
-- Fix UPDATE policy on self_assessments to include WITH CHECK clause
DROP POLICY IF EXISTS "Users can update their own self-assessments" ON public.self_assessments;
CREATE POLICY "Users can update their own self-assessments"
ON public.self_assessments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix INSERT policy to use authenticated role
DROP POLICY IF EXISTS "Users can insert their own self-assessments" ON public.self_assessments;
CREATE POLICY "Users can insert their own self-assessments"
ON public.self_assessments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix SELECT policies to use authenticated role
DROP POLICY IF EXISTS "Users can view their own self-assessments" ON public.self_assessments;
CREATE POLICY "Users can view their own self-assessments"
ON public.self_assessments
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all self-assessments" ON public.self_assessments;
CREATE POLICY "Admins can view all self-assessments"
ON public.self_assessments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow HODs to view department self-assessments
CREATE POLICY "HODs can view department self-assessments"
ON public.self_assessments
FOR SELECT TO authenticated
USING (is_hod_of_user(user_id));
