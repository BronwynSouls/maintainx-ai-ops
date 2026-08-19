-- 1. Organisation contact details
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.maintenance_companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.maintenance_companies ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.maintenance_companies ADD COLUMN IF NOT EXISTS address text;

UPDATE public.hotels
  SET phone = COALESCE(phone, '+27 21 555 0110'),
      contact_email = COALESCE(contact_email, 'operations@theskyhotel.example')
  WHERE id = '11111111-1111-4111-8111-111111111111';

UPDATE public.maintenance_companies
  SET city = COALESCE(city, 'Cape Town'),
      country = COALESCE(country, 'South Africa'),
      phone = COALESCE(phone, '+27 21 555 0142')
  WHERE id = '33333333-3333-4333-8333-333333333333';

-- 2. Category -> service routing for AI assignment
ALTER TABLE public.maintenance_categories ADD COLUMN IF NOT EXISTS default_service_slug text;
UPDATE public.maintenance_categories SET default_service_slug = 'plumbing'
  WHERE slug IN ('plumbing','bathroom','water_leakage');
UPDATE public.maintenance_categories SET default_service_slug = 'electrical'
  WHERE slug IN ('electrical','lighting','hvac','appliance');
UPDATE public.maintenance_categories SET default_service_slug = 'emergency_maintenance'
  WHERE default_service_slug IS NULL;

-- 3. Technician availability
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- 4. Ticket AI response + lifecycle timestamps
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ai_suggested_response text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ai_response_at timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- 5. Ticket status history
CREATE TABLE IF NOT EXISTS public.ticket_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  from_status public.ticket_status,
  to_status public.ticket_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_by_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_status_history TO authenticated;
GRANT ALL ON public.ticket_status_history TO service_role;

ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view ticket status history"
ON public.ticket_status_history FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tickets tk
  WHERE tk.id = ticket_status_history.ticket_id
    AND (tk.hotel_id = private.current_hotel_id()
      OR tk.assigned_technician_id IN (
        SELECT t.id FROM public.technicians t WHERE t.profile_id = auth.uid()))
));

CREATE POLICY "Staff add ticket status history"
ON public.ticket_status_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tickets tk
  WHERE tk.id = ticket_status_history.ticket_id
    AND (tk.hotel_id = private.current_hotel_id()
      OR tk.assigned_technician_id IN (
        SELECT t.id FROM public.technicians t WHERE t.profile_id = auth.uid()))
));

CREATE INDEX IF NOT EXISTS ticket_status_history_ticket_idx
  ON public.ticket_status_history (ticket_id, created_at DESC);

-- 6. Automatic lifecycle timestamps + history
CREATE OR REPLACE FUNCTION public.track_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_label text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'assigned' AND NEW.assigned_at IS NULL THEN
      NEW.assigned_at := now();
    END IF;
    IF NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;

    SELECT p.full_name INTO actor_label FROM public.profiles p WHERE p.id = auth.uid();

    INSERT INTO public.ticket_status_history (ticket_id, from_status, to_status, changed_by, changed_by_label)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), COALESCE(NULLIF(actor_label, ''), 'System'));
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id
     AND NEW.assigned_technician_id IS NOT NULL
     AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_status_history ON public.tickets;
CREATE TRIGGER trg_tickets_status_history
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.track_ticket_status_change();

-- 7. Access for the Clients directory
DROP POLICY IF EXISTS "Staff view active organisations" ON public.hotels;
CREATE POLICY "Staff view active organisations"
ON public.hotels FOR SELECT TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Staff view active companies" ON public.maintenance_companies;
CREATE POLICY "Staff view active companies"
ON public.maintenance_companies FOR SELECT TO authenticated
USING (is_active = true);

-- 8. Hotel staff can see technicians working on their hotel's tickets
DROP POLICY IF EXISTS "Hotel staff view assigned technicians" ON public.technicians;
CREATE POLICY "Hotel staff view assigned technicians"
ON public.technicians FOR SELECT TO authenticated
USING (
  (hotel_id IS NOT NULL AND hotel_id = private.current_hotel_id())
  OR EXISTS (
    SELECT 1 FROM public.tickets tk
    WHERE tk.assigned_technician_id = technicians.id
      AND tk.hotel_id = private.current_hotel_id()
  )
);

DROP POLICY IF EXISTS "Hotel staff view assigned technician services" ON public.technician_services;
CREATE POLICY "Hotel staff view assigned technician services"
ON public.technician_services FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.technicians t
  WHERE t.id = technician_services.technician_id
    AND ((t.hotel_id IS NOT NULL AND t.hotel_id = private.current_hotel_id())
      OR EXISTS (
        SELECT 1 FROM public.tickets tk
        WHERE tk.assigned_technician_id = t.id
          AND tk.hotel_id = private.current_hotel_id()
      ))
));