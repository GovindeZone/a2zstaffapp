REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_user(uuid, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated, service_role;