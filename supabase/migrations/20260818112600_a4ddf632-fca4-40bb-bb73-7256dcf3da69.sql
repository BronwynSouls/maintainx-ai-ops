-- 1. Move SECURITY DEFINER helpers out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_hotel_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT hotel_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION private.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;

REVOKE ALL ON FUNCTION private.current_hotel_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_hotel_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Recreate policies against the private helpers
DROP POLICY IF EXISTS "Hotel staff view assets" ON public.assets;
DROP POLICY IF EXISTS "Managers manage assets" ON public.assets;
CREATE POLICY "Hotel staff view assets" ON public.assets FOR SELECT TO authenticated
  USING (hotel_id = private.current_hotel_id());
CREATE POLICY "Managers manage assets" ON public.assets FOR ALL TO authenticated
  USING (hotel_id = private.current_hotel_id() AND private.has_role(auth.uid(), 'hotel_manager'))
  WITH CHECK (hotel_id = private.current_hotel_id() AND private.has_role(auth.uid(), 'hotel_manager'));

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid()
    OR (hotel_id IS NOT NULL AND hotel_id = private.current_hotel_id())
    OR (company_id IS NOT NULL AND company_id = private.current_company_id()));

DROP POLICY IF EXISTS "Staff add activity" ON public.ticket_activity;
DROP POLICY IF EXISTS "Staff view activity" ON public.ticket_activity;
CREATE POLICY "Staff add activity" ON public.ticket_activity FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_activity.ticket_id
    AND (tk.hotel_id = private.current_hotel_id()
      OR tk.assigned_technician_id IN (SELECT t.id FROM public.technicians t WHERE t.profile_id = auth.uid()))));
CREATE POLICY "Staff view activity" ON public.ticket_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_activity.ticket_id
    AND (tk.hotel_id = private.current_hotel_id()
      OR tk.assigned_technician_id IN (SELECT t.id FROM public.technicians t WHERE t.profile_id = auth.uid()))));

DROP POLICY IF EXISTS "Managers assign tickets" ON public.ticket_assignments;
DROP POLICY IF EXISTS "Staff view assignments" ON public.ticket_assignments;
CREATE POLICY "Managers assign tickets" ON public.ticket_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_assignments.ticket_id
    AND tk.hotel_id = private.current_hotel_id()));
CREATE POLICY "Staff view assignments" ON public.ticket_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_assignments.ticket_id
    AND (tk.hotel_id = private.current_hotel_id()
      OR tk.assigned_technician_id IN (SELECT t.id FROM public.technicians t WHERE t.profile_id = auth.uid()))));

DROP POLICY IF EXISTS "Hotel staff create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff update relevant tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff view relevant tickets" ON public.tickets;
CREATE POLICY "Hotel staff create tickets" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (hotel_id = private.current_hotel_id());
CREATE POLICY "Staff update relevant tickets" ON public.tickets FOR UPDATE TO authenticated
  USING (hotel_id = private.current_hotel_id()
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id AND t.profile_id = auth.uid()))
  WITH CHECK (hotel_id = private.current_hotel_id()
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id AND t.profile_id = auth.uid()));
CREATE POLICY "Staff view relevant tickets" ON public.tickets FOR SELECT TO authenticated
  USING (hotel_id = private.current_hotel_id()
    OR reporter_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id AND t.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id
      AND t.company_id IS NOT NULL AND t.company_id = private.current_company_id()));

-- 3. Technicians: no longer visible to every authenticated user
DROP POLICY IF EXISTS "Staff view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Managers manage technicians" ON public.technicians;
CREATE POLICY "Relevant staff view technicians" ON public.technicians FOR SELECT TO authenticated
  USING (profile_id = auth.uid()
    OR private.has_role(auth.uid(), 'hotel_manager')
    OR private.has_role(auth.uid(), 'admin')
    OR (company_id IS NOT NULL AND company_id = private.current_company_id()));
CREATE POLICY "Managers manage technicians" ON public.technicians FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'hotel_manager') OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'hotel_manager') OR private.has_role(auth.uid(), 'admin'));

-- 4. Drop the old public-schema helpers
DROP FUNCTION IF EXISTS public.current_hotel_id();
DROP FUNCTION IF EXISTS public.current_company_id();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 5. Remove anonymous read access to directory tables
DROP POLICY IF EXISTS "Public can view hotels" ON public.hotels;
CREATE POLICY "Staff view own hotel" ON public.hotels FOR SELECT TO authenticated
  USING (id = private.current_hotel_id() OR private.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.hotels FROM anon;

DROP POLICY IF EXISTS "Public can view locations" ON public.hotel_locations;
CREATE POLICY "Staff view own hotel locations" ON public.hotel_locations FOR SELECT TO authenticated
  USING (hotel_id = private.current_hotel_id() OR private.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.hotel_locations FROM anon;

DROP POLICY IF EXISTS "Public can view companies" ON public.maintenance_companies;
CREATE POLICY "Staff view related companies" ON public.maintenance_companies FOR SELECT TO authenticated
  USING (id = private.current_company_id()
    OR private.has_role(auth.uid(), 'hotel_manager')
    OR private.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.maintenance_companies FROM anon;

-- 6. Storage policies for the private ticket-media bucket
DROP POLICY IF EXISTS "Managers read ticket media" ON storage.objects;
CREATE POLICY "Managers read ticket media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-media'
    AND (private.has_role(auth.uid(), 'hotel_manager') OR private.has_role(auth.uid(), 'admin')));
