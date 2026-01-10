-- Add admin policies to allow viewing all data

-- Profiles: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Performance Metrics: Admins can view all metrics
CREATE POLICY "Admins can view all metrics"
ON public.performance_metrics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Capacity Skills: Admins can view all skills
CREATE POLICY "Admins can view all skills"
ON public.capacity_skills FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Motivation Scores: Admins can view all scores
CREATE POLICY "Admins can view all scores"
ON public.motivation_scores FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Activities: Admins can view all activities
CREATE POLICY "Admins can view all activities"
ON public.activities FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));