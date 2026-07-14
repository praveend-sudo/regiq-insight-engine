
CREATE TABLE public.chat_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id, shared_with)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_shares TO authenticated;
GRANT ALL ON public.chat_shares TO service_role;
ALTER TABLE public.chat_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage shares" ON public.chat_shares FOR ALL
  USING (EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.user_id = auth.uid()));

CREATE POLICY "Recipients view their shares" ON public.chat_shares FOR SELECT
  USING (shared_with = auth.uid());

-- Security-definer helper avoids recursive RLS between chats <-> chat_shares
CREATE OR REPLACE FUNCTION public.has_chat_access(_chat_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chats WHERE id = _chat_id AND user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.chat_shares WHERE chat_id = _chat_id AND shared_with = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_edit_chat(_chat_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chats WHERE id = _chat_id AND user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.chat_shares WHERE chat_id = _chat_id AND shared_with = _user_id AND permission = 'edit');
$$;

-- Extend chats and chat_messages policies for shared access
CREATE POLICY "Shared users view chat" ON public.chats FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_shares s WHERE s.chat_id = id AND s.shared_with = auth.uid()));

CREATE POLICY "Shared users view messages" ON public.chat_messages FOR SELECT
  USING (public.has_chat_access(chat_id, auth.uid()));

CREATE POLICY "Editors insert messages" ON public.chat_messages FOR INSERT
  WITH CHECK (public.can_edit_chat(chat_id, auth.uid()) AND user_id = auth.uid());
