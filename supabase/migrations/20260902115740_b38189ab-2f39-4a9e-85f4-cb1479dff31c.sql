ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS sla_tracked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assign_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolve_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_eta_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS escalation_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sla_targets (
  priority public.ticket_priority PRIMARY KEY,
  assign_minutes integer NOT NULL,
  resolve_minutes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sla_targets TO authenticated;
GRANT ALL ON public.sla_targets TO service_role;

ALTER TABLE public.sla_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read SLA targets" ON public.sla_targets;
CREATE POLICY "Staff can read SLA targets"
  ON public.sla_targets FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_sla_targets_updated ON public.sla_targets;
CREATE TRIGGER trg_sla_targets_updated
  BEFORE UPDATE ON public.sla_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.sla_targets (priority, assign_minutes, resolve_minutes) VALUES
  ('critical', 30, 240),
  ('medium', 120, 720),
  ('low', 240, 1440)
ON CONFLICT (priority) DO UPDATE
  SET assign_minutes = EXCLUDED.assign_minutes,
      resolve_minutes = EXCLUDED.resolve_minutes;

CREATE INDEX IF NOT EXISTS idx_tickets_sla_open
  ON public.tickets (sla_tracked, status)
  WHERE sla_tracked = true;