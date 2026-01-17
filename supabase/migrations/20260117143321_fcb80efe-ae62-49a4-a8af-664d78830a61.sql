-- Drop and recreate the handle_new_user function to NOT seed sample data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
  
  -- Create capacity skills with ZERO starting values (user must build these through activity)
  INSERT INTO public.capacity_skills (user_id, skill_name, current_level, target_level) VALUES
    (NEW.id, 'Teaching', 0, 100),
    (NEW.id, 'Research', 0, 100),
    (NEW.id, 'Leadership', 0, 100),
    (NEW.id, 'Communication', 0, 100),
    (NEW.id, 'Technology', 0, 100),
    (NEW.id, 'Mentoring', 0, 100);
  
  -- NO sample performance metrics - user must earn these through activities
  -- NO sample motivation scores - will be calculated from actual engagement
  -- NO sample activities - user must create their own
  
  RETURN NEW;
END;
$$;