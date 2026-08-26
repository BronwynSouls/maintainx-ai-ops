import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Registered technicians with their services — manager view. */
export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("technicians")
      .select(
        `id, full_name, specialty, technician_type, is_active, is_available, created_at,
         hotels ( name ), maintenance_companies ( name ),
         technician_services ( maintenance_services ( slug, name ) )`,
      )
      .order("full_name");
    if (error) throw new Error(error.message);

    const { data: openTickets } = await context.supabase
      .from("tickets")
      .select("assigned_technician_id, status");

    return (data ?? []).map((tech) => {
      const rows = (openTickets ?? []).filter((t) => t.assigned_technician_id === tech.id);
      return {
        id: tech.id,
        fullName: tech.full_name,
        type: tech.technician_type,
        organisation: tech.hotels?.name ?? tech.maintenance_companies?.name ?? "—",
        services: (tech.technician_services ?? [])
          .map((s) => s.maintenance_services?.name)
          .filter((n): n is string => Boolean(n)),
        isActive: tech.is_active,
        isAvailable: tech.is_available,
        openTickets: rows.filter((t) => t.status !== "resolved").length,
        resolvedTickets: rows.filter((t) => t.status === "resolved").length,
      };
    });
  });

/** Tickets assigned to the signed-in technician, with assignment timestamps. */
export const getMySchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: technician } = await context.supabase
      .from("technicians")
      .select("id, full_name, is_available")
      .eq("profile_id", context.userId)
      .maybeSingle();

    if (!technician) return { technician: null, tickets: [] };

    const { data: tickets, error } = await context.supabase
      .from("tickets")
      .select(
        `id, ticket_number, title, status, priority, created_at, assigned_at, started_at,
         resolved_at, location_text, hotel_locations ( name ), maintenance_categories ( name ),
         hotels ( name )`,
      )
      .eq("assigned_technician_id", technician.id)
      .order("assigned_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    return { technician, tickets: tickets ?? [] };
  });
/**
 * Recent tickets relevant to the signed-in technician's registered services
 * (e.g. a plumbing technician sees recent plumbing tickets). These are
 * informational only — technicians cannot assign themselves to them.
 */
export const getTechnicianFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: technician } = await context.supabase
      .from("technicians")
      .select(
        "id, full_name, hotel_id, technician_services ( maintenance_services ( slug, name ) )",
      )
      .eq("profile_id", context.userId)
      .maybeSingle();

    if (!technician) return { services: [], tickets: [] };

    const services = (technician.technician_services ?? [])
      .map((s) => s.maintenance_services)
      .filter((s): s is { slug: string; name: string } => Boolean(s));

    if (services.length === 0) return { services: [], tickets: [] };

    const { data: categories } = await context.supabase
      .from("maintenance_categories")
      .select("id, slug, name, default_service_slug")
      .in(
        "default_service_slug",
        services.map((s) => s.slug),
      );

    const categoryIds = (categories ?? []).map((c) => c.id);
    if (categoryIds.length === 0) return { services, tickets: [] };

    const { data: tickets, error } = await context.supabase
      .from("tickets")
      .select(
        `id, ticket_number, title, status, priority, created_at, location_text,
         assigned_technician_id, hotel_locations ( name ), maintenance_categories ( name ),
         hotels ( name )`,
      )
      .in("category_id", categoryIds)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw new Error(error.message);

    return { services, tickets: tickets ?? [] };
  });
