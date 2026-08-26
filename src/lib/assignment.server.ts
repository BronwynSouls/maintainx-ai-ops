/**
 * Sprint 2 — automatic technician assignment (server-only).
 *
 * A ticket is routed to a technician who is registered for the service the
 * AI category maps to, is active and available, and currently carries the
 * lightest open workload. In-house technicians of the reporting hotel are
 * preferred over outsourced ones.
 */
import type { TicketPriority } from "@/lib/domain";

export type AssignmentResult =
  | { ok: true; technicianId: string; technicianName: string; serviceSlug: string }
  | { ok: false; reason: string };

export async function assignTechnician(input: {
  ticketId: string;
  hotelId: string;
  categorySlug: string | null;
  priority: TicketPriority;
}): Promise<AssignmentResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let serviceSlug = "emergency_maintenance";
  if (input.categorySlug) {
    const { data: category } = await supabaseAdmin
      .from("maintenance_categories")
      .select("default_service_slug")
      .eq("slug", input.categorySlug)
      .maybeSingle();
    if (category?.default_service_slug) serviceSlug = category.default_service_slug;
  }

  const allowed =
    input.priority === "critical" && serviceSlug !== "emergency_maintenance"
      ? [serviceSlug, "emergency_maintenance"]
      : [serviceSlug];

  const { data: services } = await supabaseAdmin
    .from("maintenance_services")
    .select("id, slug")
    .in("slug", allowed);

  const serviceIds = (services ?? []).map((s) => s.id);
  if (serviceIds.length === 0) return { ok: false, reason: "No matching service is configured." };

  const { data: links } = await supabaseAdmin
    .from("technician_services")
    .select("technician_id")
    .in("service_id", serviceIds);

  const candidateIds = [...new Set((links ?? []).map((l) => l.technician_id))];
  if (candidateIds.length === 0)
    return { ok: false, reason: `No technician is registered for ${serviceSlug.replace(/_/g, " ")}.` };

  const { data: technicians } = await supabaseAdmin
    .from("technicians")
    .select("id, full_name, technician_type, hotel_id, company_id")
    .in("id", candidateIds)
    .eq("is_active", true)
    .eq("is_available", true);

  const pool = technicians ?? [];
  if (pool.length === 0) return { ok: false, reason: "No suitable technician is available." };

  const { data: openTickets } = await supabaseAdmin
    .from("tickets")
    .select("assigned_technician_id")
    .in("assigned_technician_id", pool.map((t) => t.id))
    .neq("status", "resolved");

  const workload = new Map<string, number>();
  for (const row of openTickets ?? []) {
    const id = row.assigned_technician_id;
    if (id) workload.set(id, (workload.get(id) ?? 0) + 1);
  }

  const ranked = [...pool].sort((a, b) => {
    const aInHouse = a.technician_type === "in_house" && a.hotel_id === input.hotelId ? 0 : 1;
    const bInHouse = b.technician_type === "in_house" && b.hotel_id === input.hotelId ? 0 : 1;
    if (aInHouse !== bInHouse) return aInHouse - bInHouse;
    return (workload.get(a.id) ?? 0) - (workload.get(b.id) ?? 0);
  });

  const chosen = ranked[0];
  if (!chosen) return { ok: false, reason: "No suitable technician is available." };

  const { error } = await supabaseAdmin
    .from("tickets")
    .update({
      assigned_technician_id: chosen.id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", input.ticketId);
  if (error) return { ok: false, reason: error.message };

  // Record the status change from "new" → "assigned" in history
  await supabaseAdmin.from("ticket_status_history").insert({
    ticket_id: input.ticketId,
    from_status: "new",
    to_status: "assigned",
    changed_by_label: "MaintainX AI",
  });

  await supabaseAdmin.from("ticket_assignments").insert({
    ticket_id: input.ticketId,
    technician_id: chosen.id,
    company_id: chosen.company_id,
  });

  return {
    ok: true,
    technicianId: chosen.id,
    technicianName: chosen.full_name,
    serviceSlug,
  };
}