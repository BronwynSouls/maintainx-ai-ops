/**
 * Ticket escalation and SLA workflow automation (server-only).
 *
 * Rules (new tickets only — `sla_tracked = true`):
 *  - Assignment / resolution targets come from `sla_targets` per priority.
 *  - A ticket escalates when it is not assigned in time, not resolved in time,
 *    when an external technician passes their recorded ETA without progress,
 *    or when a technician hands a ticket back to "New Ticket".
 *  - Escalation NEVER changes the ticket status and never (re)assigns anyone.
 *    It flags the ticket, records the reason in history and notifies the
 *    receptionist and hotel manager.
 */
import type { TicketPriority } from "@/lib/domain";
import { SLA_TARGETS } from "@/lib/sla";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function targetsFor(priority: TicketPriority) {
  const db = await admin();
  const { data } = await db
    .from("sla_targets")
    .select("assign_minutes, resolve_minutes")
    .eq("priority", priority)
    .maybeSingle();
  return {
    assignMinutes: data?.assign_minutes ?? SLA_TARGETS[priority].assignMinutes,
    resolveMinutes: data?.resolve_minutes ?? SLA_TARGETS[priority].resolveMinutes,
  };
}

/** Enable SLA tracking on a newly created ticket and stamp its deadlines. */
export async function applySlaTargets(input: {
  ticketId: string;
  priority: TicketPriority;
  from?: string | null;
}) {
  const db = await admin();
  const base = input.from ? new Date(input.from) : new Date();
  const { assignMinutes, resolveMinutes } = await targetsFor(input.priority);

  await db
    .from("tickets")
    .update({
      sla_tracked: true,
      assign_due_at: new Date(base.getTime() + assignMinutes * 60000).toISOString(),
      resolve_due_at: new Date(base.getTime() + resolveMinutes * 60000).toISOString(),
    } as never)
    .eq("id", input.ticketId);
}

/** Recompute deadlines after a priority change — tracked tickets only. */
export async function recomputeSlaTargets(ticketId: string, priority: TicketPriority) {
  const db = await admin();
  const { data: ticket } = await db
    .from("tickets")
    .select("sla_tracked, created_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket?.sla_tracked) return;
  await applySlaTargets({ ticketId, priority, from: ticket.created_at });
}

async function alreadyEscalated(ticketId: string, key: string) {
  const db = await admin();
  const { data } = await db
    .from("ticket_activity")
    .select("metadata")
    .eq("ticket_id", ticketId)
    .eq("event_type", "escalation")
    .limit(100);
  return (data ?? []).some((row) => (row.metadata as { key?: string } | null)?.key === key);
}

export type EscalationInput = {
  ticketId: string;
  /** Dedupe key — the same key never escalates twice. */
  key: string;
  reason: string;
  actorLabel?: string;
};

/**
 * Flag a ticket as escalated. Status is preserved and no technician is
 * assigned or reassigned.
 */
export async function escalateTicket(input: EscalationInput): Promise<boolean> {
  if (await alreadyEscalated(input.ticketId, input.key)) return false;
  const db = await admin();

  const { data: ticket } = await db
    .from("tickets")
    .select("id, status, escalation_count")
    .eq("id", input.ticketId)
    .maybeSingle();
  if (!ticket || ticket.status === "resolved") return false;

  const at = new Date().toISOString();
  await db
    .from("tickets")
    .update({
      is_escalated: true,
      escalated_at: at,
      escalation_reason: input.reason,
      escalation_count: (ticket.escalation_count ?? 0) + 1,
      // status intentionally untouched
    } as never)
    .eq("id", input.ticketId);

  await db.from("ticket_activity").insert({
    ticket_id: input.ticketId,
    actor_label: input.actorLabel ?? "MaintainX SLA",
    event_type: "escalation",
    message: `Escalated — ${input.reason}`,
    metadata: { key: input.key, reason: input.reason, escalated_at: at },
  });

  const { notifyEscalation } = await import("./notifications.server");
  await notifyEscalation({ ticketId: input.ticketId, reason: input.reason });
  return true;
}

/**
 * Sweep tracked, unresolved tickets and escalate the ones that breached a
 * target. Safe to call often — every trigger is deduped.
 */
export async function runEscalationSweep(): Promise<{ escalated: number }> {
  const db = await admin();
  const now = new Date();

  const { data: tickets } = await db
    .from("tickets")
    .select(
      `id, ticket_number, status, priority, assigned_technician_id, assign_due_at,
       resolve_due_at, external_eta_at, technicians ( technician_type, full_name )`,
    )
    .eq("sla_tracked", true)
    .neq("status", "resolved")
    .limit(500);

  let escalated = 0;
  for (const ticket of tickets ?? []) {
    const priority = ticket.priority as TicketPriority;

    // 1. Not assigned within the assignment target.
    if (
      !ticket.assigned_technician_id &&
      ticket.assign_due_at &&
      new Date(ticket.assign_due_at) < now
    ) {
      const ok = await escalateTicket({
        ticketId: ticket.id,
        key: "sla:assign",
        reason: `No qualified technician was assigned within the ${priority} assignment target.`,
      });
      if (ok) escalated += 1;
    }

    // 2. External technician passed their ETA without starting work.
    if (
      ticket.assigned_technician_id &&
      ticket.external_eta_at &&
      ticket.technicians?.technician_type === "external" &&
      ticket.status !== "in_progress" &&
      new Date(ticket.external_eta_at) < now
    ) {
      const ok = await escalateTicket({
        ticketId: ticket.id,
        key: `sla:eta:${ticket.external_eta_at}`,
        reason: `External technician ${ticket.technicians?.full_name ?? ""} exceeded the recorded ETA without progress.`.trim(),
      });
      if (ok) escalated += 1;
    }

    // 3. Resolution target breached.
    if (ticket.resolve_due_at && new Date(ticket.resolve_due_at) < now) {
      const ok = await escalateTicket({
        ticketId: ticket.id,
        key: "sla:resolve",
        reason: `The ${priority} resolution target passed without the ticket being resolved.`,
      });
      if (ok) escalated += 1;
    }
  }

  return { escalated };
}
