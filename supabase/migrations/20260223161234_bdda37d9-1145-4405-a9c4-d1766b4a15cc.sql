
-- Fix log_audit_event to validate caller authorization
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_log_id UUID;
BEGIN
  -- Validate that the caller is the user being logged OR is a trigger/service role (auth.uid() IS NULL)
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot create audit logs for other users';
  END IF;

  INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_action_type, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;
