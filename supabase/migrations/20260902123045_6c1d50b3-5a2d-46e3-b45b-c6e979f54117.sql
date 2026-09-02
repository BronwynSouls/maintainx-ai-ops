-- Harden profiles org-field self-assignment at the policy level too.
CREATE OR REPLACE FUNCTION private.profile_org_unchanged(_id uuid, _hotel_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _id
      AND p.hotel_id IS NOT DISTINCT FROM _hotel_id
      AND p.company_id IS NOT DISTINCT FROM _company_id
  );
$$;

REVOKE ALL ON FUNCTION private.profile_org_unchanged(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.prevent_profile_org_self_assignment() SET search_path = public, private;

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (hotel_id IS NULL AND company_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.profile_org_unchanged(auth.uid(), hotel_id, company_id)
  )
);