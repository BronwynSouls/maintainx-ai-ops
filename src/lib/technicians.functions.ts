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