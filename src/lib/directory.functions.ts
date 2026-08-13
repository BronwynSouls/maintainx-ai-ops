import { createServerFn } from "@tanstack/react-start";

/** Public directory data used by the guest QR reporting flow. */
export const getDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./public.server");
  const supabase = createPublicClient();

  const [hotels, locations, categories, companies] = await Promise.all([
    supabase.from("hotels").select("id, name, city, country").order("name"),
    supabase
      .from("hotel_locations")
      .select("id, hotel_id, name, room_number, qr_code")
      .order("name"),
    supabase.from("maintenance_categories").select("id, slug, name").order("sort_order"),
    supabase.from("maintenance_companies").select("id, name").order("name"),
  ]);

  return {
    hotels: hotels.data ?? [],
    locations: locations.data ?? [],
    categories: categories.data ?? [],
    companies: companies.data ?? [],
  };
});

/** Resolve a scanned QR code to its hotel + location. */
export const resolveQrCode = createServerFn({ method: "GET" })
  .inputValidator((input: { code: string }) => ({ code: String(input.code).slice(0, 64) }))
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./public.server");
    const supabase = createPublicClient();
    const { data: location } = await supabase
      .from("hotel_locations")
      .select("id, name, room_number, hotel_id, hotels(id, name, city)")
      .eq("qr_code", data.code)
      .maybeSingle();
    return { location: location ?? null };
  });
