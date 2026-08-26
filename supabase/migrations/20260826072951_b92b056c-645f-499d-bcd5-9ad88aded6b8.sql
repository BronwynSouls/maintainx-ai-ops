-- Reshape two existing rows into the new canonical categories
UPDATE public.maintenance_categories SET slug='emergency_maintenance', name='Emergency Maintenance', description='Urgent or dangerous issues requiring immediate attention', sort_order=3, default_service_slug='emergency_maintenance' WHERE slug='safety';
UPDATE public.maintenance_categories SET slug='general_maintenance', name='General Maintenance', description='Doors, locks, windows, furniture, cabinets, walls, ceilings, fixtures and other non-electrical repairs', sort_order=5, default_service_slug='general_maintenance' WHERE slug='furniture';

UPDATE public.maintenance_categories SET sort_order=1, default_service_slug='plumbing' WHERE slug='plumbing';
UPDATE public.maintenance_categories SET sort_order=2, default_service_slug='electrical' WHERE slug='electrical';
UPDATE public.maintenance_categories SET sort_order=4, default_service_slug='hvac', name='HVAC / Air Conditioning' WHERE slug='hvac';

-- Remap tickets/assets from retired categories to the five that remain
WITH target AS (
  SELECT slug, id FROM public.maintenance_categories
), mapping AS (
  SELECT c.id AS old_id,
         (SELECT id FROM target WHERE slug = CASE
            WHEN c.slug IN ('bathroom','water_leakage') THEN 'plumbing'
            WHEN c.slug IN ('lighting','appliance') THEN 'electrical'
            ELSE 'general_maintenance' END) AS new_id
  FROM public.maintenance_categories c
  WHERE c.slug IN ('appliance','bathroom','lighting','doors_locks','carpentry','structural','water_leakage','cleaning_facilities','other')
)
UPDATE public.tickets t SET category_id = m.new_id FROM mapping m WHERE t.category_id = m.old_id;

WITH target AS (
  SELECT slug, id FROM public.maintenance_categories
), mapping AS (
  SELECT c.id AS old_id,
         (SELECT id FROM target WHERE slug = CASE
            WHEN c.slug IN ('bathroom','water_leakage') THEN 'plumbing'
            WHEN c.slug IN ('lighting','appliance') THEN 'electrical'
            ELSE 'general_maintenance' END) AS new_id
  FROM public.maintenance_categories c
  WHERE c.slug IN ('appliance','bathroom','lighting','doors_locks','carpentry','structural','water_leakage','cleaning_facilities','other')
)
UPDATE public.assets a SET category_id = m.new_id FROM mapping m WHERE a.category_id = m.old_id;

-- Keep AI slug hints on tickets consistent with the five categories
UPDATE public.tickets SET ai_category_slug = CASE
  WHEN ai_category_slug IN ('bathroom','water_leakage') THEN 'plumbing'
  WHEN ai_category_slug IN ('lighting','appliance') THEN 'electrical'
  WHEN ai_category_slug = 'safety' THEN 'emergency_maintenance'
  WHEN ai_category_slug IN ('furniture','doors_locks','carpentry','structural','cleaning_facilities','other') THEN 'general_maintenance'
  ELSE ai_category_slug END
WHERE ai_category_slug IS NOT NULL;

DELETE FROM public.maintenance_categories
WHERE slug IN ('appliance','bathroom','lighting','doors_locks','carpentry','structural','water_leakage','cleaning_facilities','other');

-- Technician specialities for the two new categories
INSERT INTO public.maintenance_services (slug, name, sort_order) VALUES
  ('hvac', 'HVAC / Air Conditioning', 4),
  ('general_maintenance', 'General Maintenance', 5)
ON CONFLICT (slug) DO NOTHING;