/**
 * Ticket notification dispatch (server-only).
 *
 * Two audiences:
 *  - Receptionists of the ticket's hotel: told when AI assigns a ticket and
 *    when a ticket is left unassigned and needs manual assignment.
 *  - The guest/reporter, only when they opted in to updates: told when the
 *    ticket is assigned, when its status changes and when it is resolved.
 *
 * Every dispatch is recorded on `ticket_activity` with a dedupe key so the
 * same event never produces two notifications.
 */
import { sendAppEmail } from "./email.server";
import { STATUS_META, type TicketStatus } from "./domain";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Unassigned";
  return STATUS_META[status as TicketStatus]?.label ?? status;
}

/** Returns false when this exact notification was already dispatched. */
async function claim(ticketId: string, key: string, message: string, recipients: string[]) {
  const db = await admin();
  const { data: existing } = await db
    .from("ticket_activity")
    .select("id, metadata")
    .eq("ticket_id", ticketId)
    .eq("event_type", "notification")
    .limit(50);

  const already = (existing ?? []).some(
    (row) => (row.metadata as { key?: string } | null)?.key === key,
  );
  if (already) return false;

  await db.from("ticket_activity").insert({
    ticket_id: ticketId,
    actor_label: "MaintainX Notifications",
    event_type: "notification",
    message,
    // Recipient count only — guest addresses are never written to the log.
    metadata: { key, recipients: recipients.length },
  });
  return true;
}

async function ticketSummary(ticketId: string) {
  const db = await admin();
  const { data } = await db
    .from("tickets")
    .select(
      `id, ticket_number, title, status, priority, hotel_id, location_text,
       reporter_email, notify_reporter,
       hotels ( name ), hotel_locations ( name ),
       maintenance_categories ( name ), technicians ( full_name )`,
    )
    .eq("id", ticketId)
    .maybeSingle();
  return data;
}

async function receptionistEmails(hotelId: string) {
  const db = await admin();
  const { data: roles } = await db.from("user_roles").select("user_id").eq("role", "receptionist");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await db
    .from("profiles")
    .select("email, hotel_id")
    .in("id", ids)
    .eq("hotel_id", hotelId);
  return (profiles ?? []).map((p) => p.email).filter((e): e is string => Boolean(e));
}

/** Receptionist alert after the AI assignment step runs. */
export async function notifyReceptionistsOfAssignment(input: {
  ticketId: string;
  assigned: boolean;
  technicianName?: string | null;
  reason?: string | null;
}) {
  const ticket = await ticketSummary(input.ticketId);
  if (!ticket) return;

  const emails = await receptionistEmails(ticket.hotel_id);
  const key = input.assigned ? "receptionist:assigned" : "receptionist:unassigned";
  const location = ticket.hotel_locations?.name ?? ticket.location_text ?? "—";

  const subject = input.assigned
    ? `${ticket.ticket_number} assigned to ${input.technicianName ?? "a technician"}`
    : `${ticket.ticket_number} needs manual assignment`;

  const body = [
    `Ticket: ${ticket.ticket_number}`,
    `Title: ${ticket.title ?? "—"}`,
    `Property: ${ticket.hotels?.name ?? "—"}`,
    `Location: ${location}`,
    `Category: ${ticket.maintenance_categories?.name ?? "Unclassified"}`,
    `Priority: ${ticket.priority}`,
    `Status: ${statusLabel(ticket.status)}`,
    input.assigned
      ? `Assigned technician: ${input.technicianName ?? "—"}`
      : `Assignment: Unassigned — ${input.reason ?? "AI could not find a suitable available technician."} Please assign it manually.`,
  ].join("\n");

  const fresh = await claim(
    input.ticketId,
    key,
    input.assigned
      ? `Receptionist notified: ticket assigned to ${input.technicianName ?? "a technician"}.`
      : "Receptionist notified: ticket is unassigned and needs manual assignment.",
    emails,
  );
  if (!fresh) return;

  for (const to of emails) {
    await sendAppEmail({ to, subject, body });
  }
}

/** Guest update — only when the reporter opted in. */
export async function notifyGuest(input: {
  ticketId: string;
  event: "assigned" | "status" | "resolved";
  status?: string | null;
}) {
  const ticket = await ticketSummary(input.ticketId);
  if (!ticket) return;
  if (!ticket.notify_reporter || !ticket.reporter_email) return;

  const status = statusLabel(input.status ?? ticket.status);
  const key = `guest:${input.event}:${input.status ?? ticket.status ?? ""}`;

  const subject =
    input.event === "assigned"
      ? `Your request ${ticket.ticket_number} has been assigned`
      : input.event === "resolved"
        ? `Your request ${ticket.ticket_number} has been resolved`
        : `Update on your request ${ticket.ticket_number}`;

  const body = [
    "Hello,",
    "",
    `There is an update on your maintenance request ${ticket.ticket_number}.`,
    `Current status: ${status}`,
    `Location: ${ticket.hotel_locations?.name ?? ticket.location_text ?? "—"}`,
    "",
    input.event === "resolved"
      ? "The reported issue has been resolved. Thank you for letting us know."
      : "Our maintenance team is on it and you will receive further updates.",
    "",
    ticket.hotels?.name ?? "MaintainX",
  ].join("\n");

  const fresh = await claim(
    input.ticketId,
    key,
    `Guest notified of ticket ${input.event === "status" ? `status ${status}` : input.event}.`,
    [ticket.reporter_email],
  );
  if (!fresh) return;

  await sendAppEmail({ to: ticket.reporter_email, subject, body });
}

/**
 * Technician alert when a ticket is assigned to them.
 * Additive: reuses the existing dedupe claim so no event sends twice.
 */
export async function notifyTechnicianOfAssignment(input: { ticketId: string }) {
  const ticket = await ticketSummary(input.ticketId);
  if (!ticket) return;

  const db = await admin();
  const { data: assignedTicket } = await db
    .from("tickets")
    .select("assigned_technician_id")
    .eq("id", input.ticketId)
    .maybeSingle();
  const technicianId = assignedTicket?.assigned_technician_id;
  if (!technicianId) return;

  const { data: technician } = await db
    .from("technicians")
    .select("full_name, profile_id")
    .eq("id", technicianId)
    .maybeSingle();
  if (!technician?.profile_id) return;

  const { data: profile } = await db
    .from("profiles")
    .select("email")
    .eq("id", technician.profile_id)
    .maybeSingle();
  const to = profile?.email;
  if (!to) return;

  const subject = `New job assigned: ${ticket.ticket_number}`;
  const body = [
    `Hello ${technician.full_name ?? "there"},`,
    "",
    `A maintenance ticket has been assigned to you.`,
    `Ticket: ${ticket.ticket_number}`,
    `Title: ${ticket.title ?? "—"}`,
    `Property: ${ticket.hotels?.name ?? "—"}`,
    `Location: ${ticket.hotel_locations?.name ?? ticket.location_text ?? "—"}`,
    `Category: ${ticket.maintenance_categories?.name ?? "Unclassified"}`,
    `Priority: ${ticket.priority}`,
    `Status: ${statusLabel(ticket.status)}`,
  ].join("\n");

  const fresh = await claim(
    input.ticketId,
    `technician:assigned:${technicianId}`,
    "Technician notified of assignment.",
    [to],
  );
  if (!fresh) return;

  await sendAppEmail({ to, subject, body });
}
