CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_chat_owner(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chats
    WHERE id = _chat_id
      AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.is_chat_shared_with(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_shares
    WHERE chat_id = _chat_id
      AND shared_with = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.has_chat_access(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT private.is_chat_owner(_chat_id, _user_id)
      OR private.is_chat_shared_with(_chat_id, _user_id);
$$;

CREATE OR REPLACE FUNCTION private.can_edit_chat(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT private.is_chat_owner(_chat_id, _user_id)
      OR EXISTS (
        SELECT 1
        FROM public.chat_shares
        WHERE chat_id = _chat_id
          AND shared_with = _user_id
          AND permission = 'edit'
      );
$$;

REVOKE ALL ON FUNCTION private.is_chat_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_chat_shared_with(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.has_chat_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_edit_chat(uuid, uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Shared users view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Editors insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Shared users view chat" ON public.chats;
DROP POLICY IF EXISTS "Owners manage shares" ON public.chat_shares;
DROP POLICY IF EXISTS "Recipients view their shares" ON public.chat_shares;

CREATE POLICY "Shared users view messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (private.has_chat_access(chat_id, auth.uid()));

CREATE POLICY "Editors insert messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (private.can_edit_chat(chat_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Shared users view chat"
ON public.chats
FOR SELECT
TO authenticated
USING (private.is_chat_shared_with(id, auth.uid()));

CREATE POLICY "Owners manage shares"
ON public.chat_shares
FOR ALL
TO authenticated
USING (private.is_chat_owner(chat_id, auth.uid()))
WITH CHECK (private.is_chat_owner(chat_id, auth.uid()));

CREATE POLICY "Recipients view their shares"
ON public.chat_shares
FOR SELECT
TO authenticated
USING (shared_with = auth.uid());

REVOKE ALL ON FUNCTION public.is_chat_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_chat_shared_with(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_chat_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_edit_chat(uuid, uuid) FROM PUBLIC, anon, authenticated;