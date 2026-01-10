-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Update handle_new_user function to seed sample data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  -- Assign default faculty role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'faculty');
  
  -- Seed sample capacity skills
  INSERT INTO public.capacity_skills (user_id, skill_name, current_level, target_level) VALUES
    (NEW.id, 'Teaching', 65, 100),
    (NEW.id, 'Research', 55, 100),
    (NEW.id, 'Leadership', 70, 100),
    (NEW.id, 'Communication', 80, 100),
    (NEW.id, 'Technology', 60, 100),
    (NEW.id, 'Mentoring', 50, 100);
    
  -- Seed sample performance metrics (last 6 months)
  INSERT INTO public.performance_metrics (user_id, month, year, teaching_score, research_score, service_score) VALUES
    (NEW.id, 'Jan', 2026, 72, 65, 70),
    (NEW.id, 'Feb', 2026, 75, 68, 72),
    (NEW.id, 'Mar', 2026, 78, 70, 75),
    (NEW.id, 'Apr', 2026, 80, 72, 78),
    (NEW.id, 'May', 2026, 82, 75, 80),
    (NEW.id, 'Jun', 2026, 85, 78, 82);
    
  -- Seed sample motivation scores (last 8 weeks)
  INSERT INTO public.motivation_scores (user_id, week_number, year, motivation_index, engagement_score) VALUES
    (NEW.id, 1, 2026, 75, 78),
    (NEW.id, 2, 2026, 72, 75),
    (NEW.id, 3, 2026, 78, 80),
    (NEW.id, 4, 2026, 80, 82),
    (NEW.id, 5, 2026, 76, 79),
    (NEW.id, 6, 2026, 82, 85),
    (NEW.id, 7, 2026, 85, 88),
    (NEW.id, 8, 2026, 88, 90);
    
  -- Seed sample activities
  INSERT INTO public.activities (user_id, title, description, activity_type, status, completed_at) VALUES
    (NEW.id, 'Digital Teaching Methods Workshop', 'Completed online workshop on modern teaching technologies', 'workshop', 'completed', NOW() - INTERVAL '2 days'),
    (NEW.id, 'Research Paper Submission', 'Submitted paper to International Journal of Education', 'research', 'in_progress', NULL),
    (NEW.id, 'Faculty Development Program', 'Enrolled in leadership development program', 'training', 'in_progress', NULL);
  
  RETURN NEW;
END;
$function$;