
-- Revoke from PUBLIC and anon on all internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.auto_award_badges() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hod_of_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_department_self_edit() FROM PUBLIC, anon, authenticated;

-- has_role and is_hod_of_user are used in RLS; they must be executable by the calling
-- authenticated role for policy evaluation. auto_award_badges is called via RPC.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hod_of_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_award_badges() TO authenticated;
