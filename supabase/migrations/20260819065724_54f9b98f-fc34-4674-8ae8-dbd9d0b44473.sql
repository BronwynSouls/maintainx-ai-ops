CREATE OR REPLACE FUNCTION public.prevent_profile_org_self_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role / admin paths (auth.uid() is null) and admins may set org fields.
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.hotel_id := NULL;
    NEW.company_id := NULL;
  ELSE
    NEW.hotel_id := OLD.hotel_id;
    NEW.company_id := OLD.company_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_org_guard ON public.profiles;
CREATE TRIGGER trg_profiles_org_guard
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_org_self_assignment();