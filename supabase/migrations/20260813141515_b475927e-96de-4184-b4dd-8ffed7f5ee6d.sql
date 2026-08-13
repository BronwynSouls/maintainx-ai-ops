
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('hotel_manager','receptionist','technician','admin');
CREATE TYPE public.ticket_status AS ENUM ('new','assigned','in_progress','pending','scheduled','resolved');
CREATE TYPE public.ticket_priority AS ENUM ('critical','medium','low');
CREATE TYPE public.reporter_type AS ENUM ('guest','receptionist','hotel_manager','technician','system');
CREATE TYPE public.org_type AS ENUM ('hotel','apartment','property_management','business');

-- ============ ORGANISATIONS ============
CREATE TABLE public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  org_type public.org_type NOT NULL DEFAULT 'hotel',
  address text,
  city text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hotels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotels TO authenticated;
GRANT ALL ON public.hotels TO service_role;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.maintenance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.maintenance_companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_companies TO authenticated;
GRANT ALL ON public.maintenance_companies TO service_role;
ALTER TABLE public.maintenance_companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hotel_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  room_number text,
  floor text,
  qr_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hotel_locations_hotel ON public.hotel_locations(hotel_id);
GRANT SELECT ON public.hotel_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_locations TO authenticated;
GRANT ALL ON public.hotel_locations TO service_role;
ALTER TABLE public.hotel_locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.maintenance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.maintenance_categories TO anon;
GRANT SELECT ON public.maintenance_categories TO authenticated;
GRANT ALL ON public.maintenance_categories TO service_role;
ALTER TABLE public.maintenance_categories ENABLE ROW LEVEL SECURITY;

-- ============ USERS ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.maintenance_companies(id) ON DELETE SET NULL,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_hotel_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hotel_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ TECHNICIANS / ASSETS ============
CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.maintenance_companies(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  specialty text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technicians TO authenticated;
GRANT ALL ON public.technicians TO service_role;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.hotel_locations(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.maintenance_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  asset_tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- ============ TICKETS ============
CREATE SEQUENCE public.ticket_number_seq START 1;

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.hotel_locations(id) ON DELETE SET NULL,
  location_text text,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  reporter_type public.reporter_type NOT NULL DEFAULT 'guest',
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email text,
  title text,
  description text NOT NULL,
  image_url text,
  audio_url text,
  transcription text,
  input_method text NOT NULL DEFAULT 'text',
  language text NOT NULL DEFAULT 'en',
  category_id uuid REFERENCES public.maintenance_categories(id) ON DELETE SET NULL,
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  status public.ticket_status NOT NULL DEFAULT 'new',
  ai_category_slug text,
  ai_priority public.ticket_priority,
  ai_reason text,
  ai_confidence numeric,
  ai_model text,
  ai_status text NOT NULL DEFAULT 'pending',
  needs_manual_classification boolean NOT NULL DEFAULT false,
  assigned_technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_tickets_hotel ON public.tickets(hotel_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created ON public.tickets(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.assign_ticket_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'MX-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.ticket_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_tickets_number BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.assign_ticket_number();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ticket_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.maintenance_companies(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz
);
CREATE INDEX idx_assignments_ticket ON public.ticket_assignments(ticket_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_assignments TO authenticated;
GRANT ALL ON public.ticket_assignments TO service_role;
ALTER TABLE public.ticket_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ticket_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_ticket ON public.ticket_activity(ticket_id);
GRANT SELECT, INSERT ON public.ticket_activity TO authenticated;
GRANT ALL ON public.ticket_activity TO service_role;
ALTER TABLE public.ticket_activity ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
CREATE POLICY "Public can view hotels" ON public.hotels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can view locations" ON public.hotel_locations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can view categories" ON public.maintenance_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can view companies" ON public.maintenance_companies FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users manage own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (hotel_id IS NOT NULL AND hotel_id = public.current_hotel_id())
         OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Staff view technicians" ON public.technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage technicians" ON public.technicians FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hotel_manager') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'hotel_manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Hotel staff view assets" ON public.assets FOR SELECT TO authenticated USING (hotel_id = public.current_hotel_id());
CREATE POLICY "Managers manage assets" ON public.assets FOR ALL TO authenticated
  USING (hotel_id = public.current_hotel_id() AND public.has_role(auth.uid(),'hotel_manager'))
  WITH CHECK (hotel_id = public.current_hotel_id() AND public.has_role(auth.uid(),'hotel_manager'));

CREATE POLICY "Staff view relevant tickets" ON public.tickets FOR SELECT TO authenticated
  USING (
    hotel_id = public.current_hotel_id()
    OR reporter_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id AND t.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id
               AND t.company_id IS NOT NULL AND t.company_id = public.current_company_id())
  );
CREATE POLICY "Hotel staff create tickets" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.current_hotel_id());
CREATE POLICY "Staff update relevant tickets" ON public.tickets FOR UPDATE TO authenticated
  USING (
    hotel_id = public.current_hotel_id()
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id AND t.profile_id = auth.uid())
  )
  WITH CHECK (
    hotel_id = public.current_hotel_id()
    OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = tickets.assigned_technician_id AND t.profile_id = auth.uid())
  );

CREATE POLICY "Staff view assignments" ON public.ticket_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_id AND (tk.hotel_id = public.current_hotel_id() OR tk.assigned_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = auth.uid()))));
CREATE POLICY "Managers assign tickets" ON public.ticket_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_id AND tk.hotel_id = public.current_hotel_id()));

CREATE POLICY "Staff view activity" ON public.ticket_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_id AND (tk.hotel_id = public.current_hotel_id() OR tk.assigned_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = auth.uid()))));
CREATE POLICY "Staff add activity" ON public.ticket_activity FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets tk WHERE tk.id = ticket_id AND (tk.hotel_id = public.current_hotel_id() OR tk.assigned_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = auth.uid()))));

-- ============ SEED ============
INSERT INTO public.maintenance_categories (slug, name, sort_order) VALUES
  ('plumbing','Plumbing',1),
  ('electrical','Electrical',2),
  ('hvac','HVAC / Air Conditioning',3),
  ('appliance','Appliance',4),
  ('furniture','Furniture',5),
  ('bathroom','Bathroom',6),
  ('lighting','Lighting',7),
  ('doors_locks','Doors / Locks',8),
  ('carpentry','Carpentry',9),
  ('structural','Structural',10),
  ('water_leakage','Water / Leakage',11),
  ('cleaning_facilities','Cleaning / Facilities',12),
  ('safety','Safety',13),
  ('other','Other',99);

INSERT INTO public.hotels (id, name, city, country, address) VALUES
  ('11111111-1111-4111-8111-111111111111','Azure Bay Hotel','Cape Town','South Africa','12 Beach Road, Sea Point'),
  ('22222222-2222-4222-8222-222222222222','Navy Court Hotel','Johannesburg','South Africa','88 Rivonia Road, Sandton');

INSERT INTO public.maintenance_companies (id, name, contact_email) VALUES
  ('33333333-3333-4333-8333-333333333333','MaintainX Field Services','ops@maintainx.example'),
  ('44444444-4444-4444-8444-444444444444','Coastal Facilities Group','hello@coastalfg.example');

INSERT INTO public.hotel_locations (hotel_id, name, room_number, floor, qr_code) VALUES
  ('11111111-1111-4111-8111-111111111111','Room 101','101','1','AZB-101'),
  ('11111111-1111-4111-8111-111111111111','Room 102','102','1','AZB-102'),
  ('11111111-1111-4111-8111-111111111111','Room 205','205','2','AZB-205'),
  ('11111111-1111-4111-8111-111111111111','Lobby',NULL,'G','AZB-LOBBY'),
  ('11111111-1111-4111-8111-111111111111','Pool Deck',NULL,'G','AZB-POOL'),
  ('22222222-2222-4222-8222-222222222222','Room 301','301','3','NVC-301'),
  ('22222222-2222-4222-8222-222222222222','Room 302','302','3','NVC-302'),
  ('22222222-2222-4222-8222-222222222222','Conference Hall',NULL,'1','NVC-CONF');
