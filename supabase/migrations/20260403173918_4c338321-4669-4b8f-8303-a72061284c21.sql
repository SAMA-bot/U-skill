
-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own pending documents" ON public.faculty_documents;

-- Create new delete policy: owner can delete own docs, admins and HODs can delete any
CREATE POLICY "Users can delete own documents, admins and HODs can delete any"
  ON public.faculty_documents FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_hod_of_user(user_id)
  );
