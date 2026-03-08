
-- Fix security definer view - set to SECURITY INVOKER
ALTER VIEW public.courses_public SET (security_invoker = on);
