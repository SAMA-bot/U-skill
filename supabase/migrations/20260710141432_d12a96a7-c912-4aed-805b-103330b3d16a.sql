CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'department', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'faculty');

  INSERT INTO public.capacity_skills (user_id, skill_name, current_level, target_level) VALUES
    (NEW.id, 'Teaching', 0, 100),
    (NEW.id, 'Research', 0, 100),
    (NEW.id, 'Leadership', 0, 100),
    (NEW.id, 'Communication', 0, 100),
    (NEW.id, 'Technology', 0, 100),
    (NEW.id, 'Mentoring', 0, 100);

  RETURN NEW;
END;
$function$;