ALTER TABLE public.memos
  ADD COLUMN IF NOT EXISTS linked_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_notification_id uuid;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS linked_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS remind_days_before integer NOT NULL DEFAULT 3;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'update';

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check CHECK (category IN ('update', 'reminder'));