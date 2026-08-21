import { createServerFn } from "@tanstack/react-start";

/**
 * Public directory data used by the guest QR reporting flow.
 * These tables are not anon-readable; the server exposes only the
 * minimal, non-sensitive columns needed to file a request.
 */
export const getDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

  const [hotels, locations, categories, companies, services] = await Promise.all([
    supabase.from("hotels").select("id, name, city, country").eq("is_active", true).order("name"),
    supabase
      .from("hotel_locations")
      .select("id, hotel_id, name, room_number, qr_code")
      .order("name"),
    supabase.from("maintenance_categories").select("id, slug, name").order("sort_order"),
    supabase.from("maintenance_companies").select("id, name").eq("is_active", true).order("name"),
    supabase.from("maintenance_services").select("id, slug, name").order("sort_order"),
  ]);

  return {
    hotels: hotels.data ?? [],
    locations: locations.data ?? [],
    categories: categories.data ?? [],
    companies: companies.data ?? [],
    services: services.data ?? [],
  };
});

/** Resolve a scanned QR code to its hotel + location. */
export const resolveQrCode = createServerFn({ method: "GET" })
  .validator((input: { code: string }) => ({ code: String(input.code).slice(0, 64) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const { data: location } = await supabase
      .from("hotel_locations")
      .select("id, name, room_number, hotel_id, hotels(id, name, city)")
      .eq("qr_code", data.code)
      .maybeSingle();
    return { location: location ?? null };
  });
