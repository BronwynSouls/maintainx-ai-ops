/**
 * Category-based assignment eligibility (server-only).
 *
 * A ticket may only be assigned to a technician who is registered for the
 * service that the ticket's maintenance category maps to. This applies to
 * both AI assignment and manual receptionist assignment. In-house and
 * outsourced technicians are equally eligible.
 */

export type EligibleTechnician = {
  id: string;
  full_name: string;
  specialty: string | null;
  technician_type: string;
};

/** Resolve the service slug a ticket category maps to. */
export async function serviceSlugForCategory(categoryId: string | null): Promise<string | null> {
  if (!categoryId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("maintenance_categories")
    .select("default_service_slug")
    .eq("id", categoryId)
    .maybeSingle();
  return data?.default_service_slug ?? null;
}

/** Technicians registered for the given service slug (in-house and outsourced). */
export async function eligibleTechniciansForService(
  serviceSlug: string | null,
): Promise<EligibleTechnician[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!serviceSlug) return [];

  const { data: service } = await supabaseAdmin
    .from("maintenance_services")
    .select("id")
    .eq("slug", serviceSlug)
    .maybeSingle();
  if (!service) return [];

  const { data: links } = await supabaseAdmin
    .from("technician_services")
    .select("technician_id")
    .eq("service_id", service.id);

  const ids = [...new Set((links ?? []).map((l) => l.technician_id))];
  if (ids.length === 0) return [];

  const { data: technicians } = await supabaseAdmin
    .from("technicians")
    .select("id, full_name, specialty, technician_type")
    .in("id", ids)
    .eq("is_active", true)
    .order("full_name");

  return (technicians ?? []) as EligibleTechnician[];
}

/** Technicians eligible for a ticket's category. */
export async function eligibleTechniciansForCategory(
  categoryId: string | null,
): Promise<EligibleTechnician[]> {
  return eligibleTechniciansForService(await serviceSlugForCategory(categoryId));
}
