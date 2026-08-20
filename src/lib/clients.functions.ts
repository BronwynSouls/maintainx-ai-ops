import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClientOrganisation = {
  id: string;
  name: string;
  type: "Hotel" | "Maintenance company";
  location: string;
  phone: string | null;
  email: string | null;
  technicianCount?: number;
};

/** Organisations MaintainX currently serves — read from the database. */
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientOrganisation[]> => {
    const [{ data: hotels }, { data: companies }, { data: technicians }] = await Promise.all([
      context.supabase
        .from("hotels")
        .select("id, name, city, country, address, phone, contact_email")
        .eq("is_active", true)
        .order("name"),
      context.supabase
        .from("maintenance_companies")
        .select("id, name, city, country, phone, contact_email")
        .eq("is_active", true)
        .order("name"),
      context.supabase.from("technicians").select("id, hotel_id, company_id").eq("is_active", true),
    ]);

    const techs = technicians ?? [];
    const place = (city?: string | null, country?: string | null) =>
      [city, country].filter(Boolean).join(", ") || "—";

    return [
      ...(hotels ?? []).map((h) => ({
        id: h.id,
        name: h.name,
        type: "Hotel" as const,
        location: place(h.city, h.country),
        phone: h.phone,
        email: h.contact_email,
        technicianCount: techs.filter((t) => t.hotel_id === h.id).length,
      })),
      ...(companies ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        type: "Maintenance company" as const,
        location: place(c.city, c.country),
        phone: c.phone,
        email: c.contact_email,
        technicianCount: techs.filter((t) => t.company_id === c.id).length,
      })),
    ];
  });