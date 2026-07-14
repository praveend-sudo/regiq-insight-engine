
-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  source_question text,
  source_answer text,
  status text NOT NULL DEFAULT 'open',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator or assignee can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creator or assignee can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Creator can delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- FLAGGED ANSWERS
CREATE TABLE public.flagged_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  summary text NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flagged_answers TO authenticated;
GRANT ALL ON public.flagged_answers TO service_role;

ALTER TABLE public.flagged_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flagged answers" ON public.flagged_answers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated-at trigger for tasks
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow signed-in users to read basic profile info of other users (name only, for assignment)
CREATE POLICY "Authenticated can read profile names" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Security-definer function: resolve email -> user id (for assigning tasks)
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;
