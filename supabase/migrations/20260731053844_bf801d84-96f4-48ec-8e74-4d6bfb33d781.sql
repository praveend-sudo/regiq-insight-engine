ALTER TABLE public.memos
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS remind_days_before integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reminded_at timestamp with time zone;