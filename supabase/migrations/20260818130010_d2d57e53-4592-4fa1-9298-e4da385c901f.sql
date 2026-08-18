-- 1. technician type enum
DO $$ BEGIN
  CREATE TYPE public.technician_type AS ENUM ('in_house','external');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS technician_type public.technician_type NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;

-- 2. active flags for selectable orgs
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.maintenance_companies ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3. services catalogue
CREATE TABLE IF NOT EXISTS public.maintenance_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.maintenance_services TO authenticated;
GRANT ALL ON public.maintenance_services TO service_role;
ALTER TABLE public.maintenance_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view services" ON public.maintenance_services;
CREATE POLICY "Staff view services" ON public.maintenance_services
  FOR SELECT TO authenticated USING (true);

-- 4. technician <-> services join
CREATE TABLE IF NOT EXISTS public.technician_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.maintenance_services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (technician_id, service_id)
);
GRANT SELECT ON public.technician_services TO authenticated;
GRANT ALL ON public.technician_services TO service_role;
ALTER TABLE public.technician_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Relevant staff view technician services" ON public.technician_services;
CREATE POLICY "Relevant staff view technician services" ON public.technician_services
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.id = technician_services.technician_id
        AND (
          t.profile_id = auth.uid()
          OR private.has_role(auth.uid(), 'hotel_manager'::app_role)
          OR private.has_role(auth.uid(), 'admin'::app_role)
          OR (t.company_id IS NOT NULL AND t.company_id = private.current_company_id())
          OR (t.hotel_id IS NOT NULL AND t.hotel_id = private.current_hotel_id())
        )
    )
  );

-- 5. reference data
INSERT INTO public.maintenance_services (slug, name, sort_order) VALUES
  ('plumbing','Plumbing',1),
  ('electrical','Electrical',2),
  ('emergency_maintenance','Emergency Maintenance',3)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.hotels SET name = 'The Sky Hotel' WHERE id = '11111111-1111-4111-8111-111111111111';
UPDATE public.hotels SET is_active = false WHERE id <> '11111111-1111-4111-8111-111111111111';
UPDATE public.maintenance_companies SET name = 'Schmidhauser' WHERE id = '33333333-3333-4333-8333-333333333333';
UPDATE public.maintenance_companies SET is_active = false WHERE id <> '33333333-3333-4333-8333-333333333333';