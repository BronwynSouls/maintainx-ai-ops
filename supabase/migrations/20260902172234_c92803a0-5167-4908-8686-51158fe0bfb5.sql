CREATE TABLE public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  ticket_number text,
  kind text NOT NULL,
  title text NOT NULL,
  message text,
  severity text NOT NULL DEFAULT 'info',
  dedupe_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX app_notifications_user_dedupe_idx ON public.app_notifications (user_id, dedupe_key);
CREATE INDEX app_notifications_user_created_idx ON public.app_notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.app_notifications TO authenticated;
GRANT ALL ON public.app_notifications TO service_role;

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own notifications"
  ON public.app_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark their own notifications read"
  ON public.app_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER app_notifications_set_updated_at
  BEFORE UPDATE ON public.app_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER TABLE public.app_notifications REPLICA IDENTITY FULL;