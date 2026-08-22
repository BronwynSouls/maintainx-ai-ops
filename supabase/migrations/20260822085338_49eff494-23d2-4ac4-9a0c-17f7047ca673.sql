DROP POLICY IF EXISTS "Staff view active organisations" ON public.hotels;
DROP POLICY IF EXISTS "Staff view active companies" ON public.maintenance_companies;

DROP POLICY IF EXISTS "Managers read ticket media" ON storage.objects;
CREATE POLICY "Managers read own hotel ticket media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-media'
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (
      private.has_role(auth.uid(), 'hotel_manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.image_url = storage.objects.name
          AND t.hotel_id = private.current_hotel_id()
      )
    )
  )
);