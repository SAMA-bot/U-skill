-- Fix 1: audit_logs - Remove permissive INSERT policy
-- Only the log_audit_event() SECURITY DEFINER function should insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- No new INSERT policy - inserts only happen via log_audit_event() function
-- which runs as SECURITY DEFINER and bypasses RLS

-- Fix 2: rate_limits - Replace overly permissive policy with system-only access
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Rate limits should only be managed by system functions (check_rate_limit)
-- No direct user access allowed - the function is SECURITY DEFINER
-- We create a policy that effectively denies all user access
CREATE POLICY "Deny direct rate_limits access"
ON public.rate_limits
FOR ALL
USING (false)
WITH CHECK (false);

-- Fix 3: profiles - Already has good RLS but let's ensure explicit deny for anon
-- First check existing policies are restrictive (they are based on auth.uid() = user_id)
-- Add explicit comment that anon users have no access since they have no auth.uid()