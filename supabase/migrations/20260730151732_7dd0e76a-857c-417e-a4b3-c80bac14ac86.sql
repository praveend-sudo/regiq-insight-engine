ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

CREATE TABLE public.compliance_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  source_type text NOT NULL DEFAULT 'external',
  issuer text,
  audience text NOT NULL DEFAULT 'regulator',
  frequency text NOT NULL DEFAULT 'monthly',
  next_due_date date NOT NULL,
  lead_days integer NOT NULL DEFAULT 7,
  recipients text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  last_completed_at timestamptz,
  reminded_for date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_obligations TO authenticated;
GRANT ALL ON public.compliance_obligations TO service_role;
ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own obligations" ON public.compliance_obligations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_compliance_obligations_updated_at
  BEFORE UPDATE ON public.compliance_obligations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  change_summary text,
  issuer text,
  body text NOT NULL DEFAULT '',
  recipient_email text,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memos TO authenticated;
GRANT ALL ON public.memos TO service_role;
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memos" ON public.memos
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON public.memos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();