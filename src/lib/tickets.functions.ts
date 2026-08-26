import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { TicketStatus } from "@/lib/domain";

const submitSchema = z.object({
  hotelId: z.string().uuid(),
  locationId: z.string().uuid().nullable().optional(),
  locationText: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().min(5, "Please describe the problem").max(2000),
  reporterEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  notifyReporter: z.boolean().default(false),
  reporterType: z.enum(["guest", "receptionist", "hotel_manager", "technician"]).default("guest"),
  inputMethod: z.enum(["text", "voice", "image"]).default("text"),
  transcription: z.string().trim().max(4000).optional().or(z.literal("")),
  language: z.string().max(8).default("en"),
  imageDataUrl: z.string().max(8_000_000).optional().or(z.literal("")),
});

export type SubmitResult = {
  ticketNumber: string;
  ticketId: string;
  status: string;
  assignedTo?: string | null;
  ai:
    | { ok: true; categoryName: string; priority: string; reason: string }
    | { ok: false; error: string };
};

/**
 * Public endpoint used by guests (QR flow) and staff.
 * The ticket is always saved first; AI classification is best-effort.
 */
export const submitMaintenanceRequest = createServerFn({ method: "POST" })
  .validator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let imageUrl: string | null = null;
    if (data.imageDataUrl && data.imageDataUrl.startsWith("data:image/")) {
      const [meta, base64] = data.imageDataUrl.split(",");
      const mime = meta?.slice(5).split(";")[0] ?? "image/jpeg";
      const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      if (base64) {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const path = `tickets/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabaseAdmin.storage
          .from("ticket-media")
          .upload(path, bytes, { contentType: mime, upsert: false });
        if (!error) imageUrl = path;
      }
    }

    const { data: hotel } = await supabaseAdmin
      .from("hotels")
      .select("name")
      .eq("id", data.hotelId)
      .maybeSingle();

    let locationLabel = data.locationText ?? "";
    if (data.locationId) {
      const { data: loc } = await supabaseAdmin
        .from("hotel_locations")
        .select("name, room_number")
        .eq("id", data.locationId)
        .maybeSingle();
      if (loc) locationLabel = loc.room_number ? `${loc.name}` : loc.name;
    }

    const { data: ticket, error: insertError } = await supabaseAdmin
      .from("tickets")
      .insert({
        hotel_id: data.hotelId,
        location_id: data.locationId ?? null,
        location_text: locationLabel || null,
        description: data.description,
        title: data.description.slice(0, 80),
        reporter_type: data.reporterType,
        reporter_email: data.reporterEmail || null,
        notify_reporter: Boolean(data.notifyReporter && data.reporterEmail),
        input_method: data.inputMethod,
        language: data.language,
        transcription: data.transcription || null,
        image_url: imageUrl,
        status: "new",
        ai_status: "pending",
      } as never)
      .select("id, ticket_number")
      .single();

    if (insertError || !ticket) {
      throw new Error(insertError?.message ?? "Could not save the maintenance request.");
    }

    await supabaseAdmin.from("ticket_activity").insert({
      ticket_id: ticket.id,
      actor_label: data.reporterType === "guest" ? "Guest" : "Staff",
      event_type: "created",
      message: `Ticket ${ticket.ticket_number} created via ${data.inputMethod} input.`,
    });

    // --- AI classification (best effort) ---
    const { classifyMaintenanceRequest } = await import("./ai/service.server");
    const result = await classifyMaintenanceRequest({
      description: `${data.description}${data.transcription ? `\nTranscript: ${data.transcription}` : ""}`,
      location: locationLabel,
      hotel: hotel?.name ?? null,
    });

    if (result.ok) {
      const { data: category } = await supabaseAdmin
        .from("maintenance_categories")
        .select("id, name")
        .eq("slug", result.categorySlug)
        .maybeSingle();

      await supabaseAdmin
        .from("tickets")
        .update({
          category_id: category?.id ?? null,
          ai_category_slug: result.categorySlug,
          ai_priority: result.priority,
          ai_reason: result.reason,
          ai_confidence: result.confidence,
          ai_model: result.model,
          ai_status: "classified",
          priority: result.priority,
          needs_manual_classification: false,
        })
        .eq("id", ticket.id);

      await supabaseAdmin.from("ticket_activity").insert({
        ticket_id: ticket.id,
        actor_label: "MaintainX AI",
        event_type: "ai_classified",
        message: `Classified as ${category?.name ?? result.categorySlug} · suggested priority ${result.priority}.`,
        metadata: { reason: result.reason, confidence: result.confidence },
      });

      // --- Automatic technician assignment (skill + availability aware) ---
      const { assignTechnician } = await import("./assignment.server");
      const assignment = await assignTechnician({
        ticketId: ticket.id,
        hotelId: data.hotelId,
        categorySlug: result.categorySlug,
        priority: result.priority,
      });

      await supabaseAdmin.from("ticket_activity").insert({
        ticket_id: ticket.id,
        actor_label: "MaintainX AI",
        event_type: assignment.ok ? "assigned" : "assignment_failed",
        message: assignment.ok
          ? `Assigned to ${assignment.technicianName} (${assignment.serviceSlug.replace(/_/g, " ")}).`
          : `Automatic assignment not possible — ${assignment.reason}`,
      });

      // --- Suggested response (best effort) ---
      const { generateTicketResponse } = await import("./ai/service.server");
      const suggestion = await generateTicketResponse({
        description: data.description,
        category: category?.name ?? result.categorySlug,
        priority: result.priority,
        status: assignment.ok ? "assigned" : "new",
        location: locationLabel,
      });
      if (suggestion.ok) {
        await supabaseAdmin
          .from("tickets")
          .update({
            ai_suggested_response: suggestion.message,
            ai_response_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);
      }

      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: assignment.ok ? "assigned" : "new",
        assignedTo: assignment.ok ? assignment.technicianName : null,
        ai: {
          ok: true,
          categoryName: category?.name ?? result.categorySlug,
          priority: result.priority,
          reason: result.reason,
        },
      };
    }

    await supabaseAdmin
      .from("tickets")
      .update({ ai_status: "failed", ai_reason: result.error, needs_manual_classification: true })
      .eq("id", ticket.id);

    await supabaseAdmin.from("ticket_activity").insert({
      ticket_id: ticket.id,
      actor_label: "MaintainX AI",
      event_type: "ai_failed",
      message: "AI classification unavailable — flagged for manual classification.",
      metadata: { error: result.error },
    });

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      status: "new",
      ai: { ok: false, error: result.error },
    };
  });

const TICKET_SELECT = `
  id, ticket_number, hotel_id, location_id, location_text, description, title,
  image_url, transcription, input_method, reporter_type, reporter_email,
  priority, status, ai_category_slug, ai_priority, ai_reason, ai_confidence,
  ai_status, ai_suggested_response, ai_response_at,
  needs_manual_classification, assigned_technician_id,
  created_at, updated_at, resolved_at, assigned_at, started_at,
  hotels ( id, name, city ),
  hotel_locations ( id, name, room_number ),
  maintenance_categories ( id, slug, name ),
  technicians ( id, full_name, technician_type )
`;

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select(TICKET_SELECT)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Roles + linked technician record for the signed-in user. */
async function getActorContext(context: { supabase: any; userId: string }) {
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roleList: string[] = (roles ?? []).map((r: { role: string }) => r.role);
  const isPrivileged = roleList.includes("hotel_manager") || roleList.includes("admin");
  const isTechnicianOnly = roleList.includes("technician") && !isPrivileged;

  let technicianId: string | null = null;
  if (roleList.includes("technician")) {
    const { data: tech } = await context.supabase
      .from("technicians")
      .select("id")
      .eq("profile_id", context.userId)
      .maybeSingle();
    technicianId = tech?.id ?? null;
  }

  return {
    roles: roleList,
    isTechnicianOnly,
    technicianId,
    /** Only receptionists may assign or reassign tickets manually. */
    canAssign: roleList.includes("receptionist"),
  };
}

export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: z.string().uuid().parse(input.id) }))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("tickets")
      .select(TICKET_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) return { ticket: null, activity: [], imageUrl: null, technicians: [] };

    // Technicians may only open tickets assigned to them.
    const actor = await getActorContext(context);
    if (
      actor.isTechnicianOnly &&
      (!actor.technicianId || ticket.assigned_technician_id !== actor.technicianId)
    ) {
      return { ticket: null, activity: [], statusHistory: [], imageUrl: null, technicians: [] };
    }


    const { data: activity } = await context.supabase
      .from("ticket_activity")
      .select("id, event_type, message, actor_label, created_at, metadata")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: false });

    const { data: technicians } = await context.supabase
      .from("technicians")
      .select("id, full_name, specialty")
      .eq("is_active", true)
      .order("full_name");

    const { data: statusHistory } = await context.supabase
      .from("ticket_status_history")
      .select("id, from_status, to_status, changed_by_label, created_at")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: false });

    let imageUrl: string | null = null;
    if (ticket.image_url) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from("ticket-media")
        .createSignedUrl(ticket.image_url, 60 * 60);
      imageUrl = signed?.signedUrl ?? null;
    }

    return {
      ticket,
      activity: activity ?? [],
      technicians: technicians ?? [],
      statusHistory: statusHistory ?? [],
      imageUrl,
    };
  });

export const updateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z
          .enum(["new", "assigned", "in_progress", "pending", "scheduled", "resolved"])
          .optional(),
        priority: z.enum(["critical", "medium", "low"]).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        technicianId: z.string().uuid().nullable().optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Fetch current status so we can record status history
    const { data: current } = await context.supabase
      .from("tickets")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    const previousStatus = (current as { status?: TicketStatus } | null)?.status ?? null;

    const patch: Record<string, unknown> = {};
    if (data.status) {
      patch["status"] = data.status;
      patch["resolved_at"] = data.status === "resolved" ? new Date().toISOString() : null;
      if (data.status === "in_progress") patch["started_at"] = new Date().toISOString();
    }
    if (data.priority) patch["priority"] = data.priority;
    if (data.categoryId !== undefined) patch["category_id"] = data.categoryId;
    if (data.technicianId !== undefined) {
      patch["assigned_technician_id"] = data.technicianId;
      if (data.technicianId && !data.status) patch["status"] = "assigned";
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await context.supabase.from("tickets").update(patch as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const actorLabel = profile?.full_name || "Staff";

    // Record status change in ticket_status_history
    const newStatus = (patch["status"] as TicketStatus | undefined) ?? null;
    if (data.status && newStatus && newStatus !== previousStatus) {
      await context.supabase.from("ticket_status_history").insert({
        ticket_id: data.id,
        from_status: previousStatus,
        to_status: newStatus,
        changed_by: context.userId,
        changed_by_label: actorLabel,
      });
    }

    const parts: string[] = [];
    if (data.status) parts.push(`status → ${data.status}`);
    if (data.priority) parts.push(`priority → ${data.priority}`);
    if (data.technicianId !== undefined)
      parts.push(data.technicianId ? "technician assigned" : "technician cleared");
    if (data.note) parts.push(data.note);

    if (parts.length > 0) {
      await context.supabase.from("ticket_activity").insert({
        ticket_id: data.id,
        actor_user_id: context.userId,
        actor_label: actorLabel,
        event_type: "updated",
        message: parts.join(" · "),
      });
    }

    if (data.technicianId) {
      await context.supabase.from("ticket_assignments").insert({
        ticket_id: data.id,
        technician_id: data.technicianId,
        assigned_by: context.userId,
      });
    }

    return { ok: true };
  });

/** Regenerate the AI suggested response for a ticket. */
export const regenerateTicketResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: z.string().uuid().parse(input.id) }))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("tickets")
      .select("id, description, priority, status, location_text, maintenance_categories ( name )")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("Ticket not found.");

    const { generateTicketResponse } = await import("./ai/service.server");
    const result = await generateTicketResponse({
      description: ticket.description,
      category: ticket.maintenance_categories?.name ?? "Unclassified",
      priority: ticket.priority,
      status: ticket.status,
      location: ticket.location_text,
    });
    if (!result.ok) return { ok: false as const, error: result.error };

    const { error: updateError } = await context.supabase
      .from("tickets")
      .update({
        ai_suggested_response: result.message,
        ai_response_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true as const, message: result.message };
  });

/**
 * Sprint 2 — AI-classified tickets with their assigned technicians.
 * Receptionists use this to see which tickets AI has classified and who was assigned.
 * Technicians use this to see and update their own assigned work.
 */
export const listAiTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roleList = (roles ?? []).map((r) => r.role);
    const isTechnician = roleList.includes("technician") && !roleList.includes("hotel_manager") && !roleList.includes("admin");

    let query = context.supabase
      .from("tickets")
      .select(TICKET_SELECT)
      .order("created_at", { ascending: false })
      .limit(200);

    // Technicians only see tickets assigned to them
    if (isTechnician) {
      const { data: tech } = await context.supabase
        .from("technicians")
        .select("id")
        .eq("profile_id", context.userId)
        .maybeSingle();
      if (tech) {
        query = query.eq("assigned_technician_id", tech.id);
      } else {
        return [];
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });
