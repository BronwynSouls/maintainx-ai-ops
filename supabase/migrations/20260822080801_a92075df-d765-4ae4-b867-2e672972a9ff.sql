
-- Break mutual recursion between tickets and technicians policies via SECURITY DEFINER helpers

CREATE OR REPLACE FUNCTION private.current_technician_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.technicians WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.company_technician_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id FROM public.technicians t
  WHERE t.company_id IS NOT NULL AND t.company_id = private.current_company_id();
$$;

CREATE OR REPLACE FUNCTION private.hotel_assigned_technician_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT tk.assigned_technician_id FROM public.tickets tk
  WHERE tk.assigned_technician_id IS NOT NULL
    AND tk.hotel_id = private.current_hotel_id();
$$;

REVOKE EXECUTE ON FUNCTION private.current_technician_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.company_technician_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.hotel_assigned_technician_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_technician_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.company_technician_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.hotel_assigned_technician_ids() TO authenticated, service_role;

DROP POLICY IF EXISTS "Hotel staff view assigned technicians" ON public.technicians;
CREATE POLICY "Hotel staff view assigned technicians"
ON public.technicians FOR SELECT TO authenticated
USING (
  ((hotel_id IS NOT NULL) AND (hotel_id = private.current_hotel_id()))
  OR id IN (SELECT private.hotel_assigned_technician_ids())
);

DROP POLICY IF EXISTS "Staff view relevant tickets" ON public.tickets;
CREATE POLICY "Staff view relevant tickets"
ON public.tickets FOR SELECT TO authenticated
USING (
  (hotel_id = private.current_hotel_id())
  OR (reporter_user_id = auth.uid())
  OR (assigned_technician_id IN (SELECT private.current_technician_ids()))
  OR (assigned_technician_id IN (SELECT private.company_technician_ids()))
);

DROP POLICY IF EXISTS "Staff update relevant tickets" ON public.tickets;
CREATE POLICY "Staff update relevant tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (
  (hotel_id = private.current_hotel_id())
  OR (assigned_technician_id IN (SELECT private.current_technician_ids()))
);
