CREATE OR REPLACE FUNCTION private.can_view_technician(
  _technician_id uuid,
  _profile_id uuid,
  _hotel_id uuid,
  _company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _profile_id = auth.uid()
    OR private.has_role(auth.uid(), 'hotel_manager'::public.app_role)
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      _company_id IS NOT NULL
      AND _company_id = private.current_company_id()
    )
    OR (
      _hotel_id IS NOT NULL
      AND _hotel_id = private.current_hotel_id()
    )
    OR EXISTS (
      SELECT 1
      FROM public.tickets tk
      WHERE tk.assigned_technician_id = _technician_id
        AND tk.hotel_id = private.current_hotel_id()
    );
$$;

REVOKE ALL ON FUNCTION private.can_view_technician(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_technician(uuid, uuid, uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Hotel staff view assigned technicians" ON public.technicians;
DROP POLICY IF EXISTS "Relevant staff view technicians" ON public.technicians;

CREATE POLICY "Authenticated staff view relevant technicians"
ON public.technicians
FOR SELECT
TO authenticated
USING (
  private.can_view_technician(id, profile_id, hotel_id, company_id)
);