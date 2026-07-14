REVOKE ALL ON FUNCTION public.is_chat_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_chat_shared_with(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_chat_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_chat(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_chat_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_chat_shared_with(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_chat_access(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_chat(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated, service_role;