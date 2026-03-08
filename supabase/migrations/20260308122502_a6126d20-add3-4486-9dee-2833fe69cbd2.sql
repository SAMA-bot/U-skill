
-- Allow admins to insert achievement badges for any user
CREATE POLICY "Admins can insert badges"
ON public.achievement_badges
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all badges
CREATE POLICY "Admins can view all badges"
ON public.achievement_badges
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete badges
CREATE POLICY "Admins can delete badges"
ON public.achievement_badges
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
