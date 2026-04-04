
-- Add soft delete column
ALTER TABLE public.faculty_documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add deleted_by column to track who deleted
ALTER TABLE public.faculty_documents
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Update existing SELECT policies to exclude soft-deleted docs
DROP POLICY IF EXISTS "Users can view their own documents" ON public.faculty_documents;
CREATE POLICY "Users can view their own documents"
  ON public.faculty_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all documents" ON public.faculty_documents;
CREATE POLICY "Admins can view all documents"
  ON public.faculty_documents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "HODs can view department documents" ON public.faculty_documents;
CREATE POLICY "HODs can view department documents"
  ON public.faculty_documents FOR SELECT
  TO authenticated
  USING (is_hod_of_user(user_id) AND deleted_at IS NULL);

-- Create function to log document deletion to audit_logs
CREATE OR REPLACE FUNCTION public.audit_document_soft_delete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  deleter_roles text[];
BEGIN
  -- Only trigger when deleted_at changes from NULL to a value
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    SELECT array_agg(role::text) INTO deleter_roles
    FROM public.user_roles
    WHERE user_id = NEW.deleted_by;

    PERFORM public.log_audit_event(
      COALESCE(NEW.deleted_by, NEW.user_id),
      'DOCUMENT_DELETED',
      'faculty_document',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'document_type', NEW.document_type,
        'file_name', NEW.file_name,
        'document_owner', NEW.user_id,
        'deleted_by_roles', COALESCE(deleter_roles, ARRAY['unknown'])
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_audit_document_soft_delete ON public.faculty_documents;
CREATE TRIGGER trg_audit_document_soft_delete
  AFTER UPDATE ON public.faculty_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_document_soft_delete();
