CREATE TABLE IF NOT EXISTS public.telegram_publications (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  telegram_message_ids jsonb,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_publications FROM anon, authenticated;

-- Diagnostic after publishing an announcement:
-- SELECT property_id, status, sent_at, last_error
-- FROM public.telegram_publications ORDER BY created_at DESC LIMIT 15;
