-- Add explicit DENY policies for write operations on user_roles table
-- This prevents any direct modifications through the Supabase client
-- Role assignments should only happen via the handle_new_user trigger

-- Deny all direct inserts (only trigger should create roles)
CREATE POLICY "Deny direct role inserts"
ON public.user_roles FOR INSERT
WITH CHECK (false);

-- Deny all updates
CREATE POLICY "Deny role updates"
ON public.user_roles FOR UPDATE
USING (false);

-- Deny all deletes  
CREATE POLICY "Deny role deletes"
ON public.user_roles FOR DELETE
USING (false);