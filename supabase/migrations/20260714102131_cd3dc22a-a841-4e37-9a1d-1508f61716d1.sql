
DROP POLICY IF EXISTS "Shared users view chat" ON public.chats;
CREATE POLICY "Shared users view chat" ON public.chats FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_shares s WHERE s.chat_id = chats.id AND s.shared_with = auth.uid()));
