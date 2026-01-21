-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Only system can insert (via triggers/functions)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_action_type, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;

-- Trigger function for course completion auditing
CREATE OR REPLACE FUNCTION public.audit_course_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  course_title TEXT;
BEGIN
  -- Only log when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get course title for metadata
    SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;
    
    PERFORM public.log_audit_event(
      NEW.user_id,
      'COURSE_COMPLETED',
      'course_enrollment',
      NEW.id,
      jsonb_build_object(
        'course_id', NEW.course_id,
        'course_title', COALESCE(course_title, 'Unknown Course'),
        'progress_percentage', NEW.progress_percentage,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for course completion
CREATE TRIGGER audit_course_completion_trigger
AFTER UPDATE ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.audit_course_completion();

-- Trigger function for role change auditing
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get user info for metadata
  SELECT email, full_name INTO user_email, user_name 
  FROM public.profiles 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'ROLE_ASSIGNED',
      'user_role',
      NEW.id,
      jsonb_build_object(
        'role', NEW.role,
        'user_email', COALESCE(user_email, 'Unknown'),
        'user_name', COALESCE(user_name, 'Unknown')
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'ROLE_CHANGED',
      'user_role',
      NEW.id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'user_email', COALESCE(user_email, 'Unknown'),
        'user_name', COALESCE(user_name, 'Unknown')
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      OLD.user_id,
      'ROLE_REMOVED',
      'user_role',
      OLD.id,
      jsonb_build_object(
        'role', OLD.role,
        'user_email', COALESCE(user_email, 'Unknown'),
        'user_name', COALESCE(user_name, 'Unknown')
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for role changes
CREATE TRIGGER audit_role_insert_trigger
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_change();

CREATE TRIGGER audit_role_update_trigger
AFTER UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_change();

CREATE TRIGGER audit_role_delete_trigger
AFTER DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_change();

-- Trigger function for user creation/deletion auditing
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'USER_CREATED',
      'profile',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'department', COALESCE(NEW.department, 'Not set')
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log significant profile updates
    IF OLD.full_name != NEW.full_name OR OLD.department IS DISTINCT FROM NEW.department OR OLD.designation IS DISTINCT FROM NEW.designation THEN
      PERFORM public.log_audit_event(
        NEW.user_id,
        'PROFILE_UPDATED',
        'profile',
        NEW.id,
        jsonb_build_object(
          'changes', jsonb_build_object(
            'full_name', CASE WHEN OLD.full_name != NEW.full_name THEN jsonb_build_object('from', OLD.full_name, 'to', NEW.full_name) ELSE NULL END,
            'department', CASE WHEN OLD.department IS DISTINCT FROM NEW.department THEN jsonb_build_object('from', OLD.department, 'to', NEW.department) ELSE NULL END,
            'designation', CASE WHEN OLD.designation IS DISTINCT FROM NEW.designation THEN jsonb_build_object('from', OLD.designation, 'to', NEW.designation) ELSE NULL END
          )
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile changes
CREATE TRIGGER audit_profile_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_profile_changes();

-- Trigger function for course management auditing
CREATE OR REPLACE FUNCTION public.audit_course_management()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.created_by,
      'COURSE_CREATED',
      'course',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'category', NEW.category,
        'course_type', NEW.course_type,
        'is_published', NEW.is_published
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_published != NEW.is_published THEN
      PERFORM public.log_audit_event(
        NEW.created_by,
        CASE WHEN NEW.is_published THEN 'COURSE_PUBLISHED' ELSE 'COURSE_UNPUBLISHED' END,
        'course',
        NEW.id,
        jsonb_build_object(
          'title', NEW.title
        )
      );
    ELSIF OLD.title != NEW.title OR OLD.category != NEW.category THEN
      PERFORM public.log_audit_event(
        NEW.created_by,
        'COURSE_UPDATED',
        'course',
        NEW.id,
        jsonb_build_object(
          'title', NEW.title,
          'old_title', CASE WHEN OLD.title != NEW.title THEN OLD.title ELSE NULL END
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      OLD.created_by,
      'COURSE_DELETED',
      'course',
      OLD.id,
      jsonb_build_object(
        'title', OLD.title,
        'category', OLD.category
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for course management
CREATE TRIGGER audit_course_insert_trigger
AFTER INSERT ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.audit_course_management();

CREATE TRIGGER audit_course_update_trigger
AFTER UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.audit_course_management();

CREATE TRIGGER audit_course_delete_trigger
AFTER DELETE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.audit_course_management();