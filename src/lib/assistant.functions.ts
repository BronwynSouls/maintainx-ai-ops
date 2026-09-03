import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STATUS_META, PRIORITY_META } from "@/lib/domain";
import type { TicketPriority, TicketStatus } from "@/lib/domain";

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const askSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(turnSchema).max(12).default([]),
});

export type AssistantReply = { ok: true; reply: string } | { ok: false; error: string };

const TICKET_NUMBER_RE = /MX-\d{4}-\d{4,6}/i;

function statusLabel(status: string) {
  return STATUS_META[status as TicketStatus]?.label ?? status;
}
function priorityLabel(priority: string) {
  return PRIORITY_META[priority as TicketPriority]?.label ?? priority;
}

/* ------------------------------------------------------------------ */
/* Guest assistant — public, no account. Ticket lookup by exact number. */
/* ------------------------------------------------------------------ */
export const askGuestAssistant = createServerFn({ method: "POST" })
  .validator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data }): Promise<AssistantReply> => {
    const { askAssistant } = await import("@/lib/ai/assistant.server");

    let contextBlock = "No ticket number was provided in this message.";
    const match = data.message.match(TICKET_NUMBER_RE);
    if (match) {
      const ticketNumber = match[0].toUpperCase();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: ticket } = await supabaseAdmin
        .from("tickets")
        .select("ticket_number, status, priority, created_at, updated_at, resolved_at")
        .eq("ticket_number", ticketNumber)
        .maybeSingle();

      contextBlock = ticket
        ? [
            `Ticket lookup for ${ticket.ticket_number} (this is the only ticket you may mention):`,
            `- Status: ${statusLabel(ticket.status)}`,
            `- Priority: ${priorityLabel(ticket.priority)}`,
            `- Reported: ${new Date(ticket.created_at).toUTCString()}`,
            `- Last update: ${new Date(ticket.updated_at).toUTCString()}`,
            ticket.resolved_at ? `- Resolved: ${new Date(ticket.resolved_at).toUTCString()}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : `No ticket exists with the number ${ticketNumber}. Ask the guest to check the exact ticket number from their confirmation screen.`;
    }

    return askAssistant({
      audience: "guest",
      contextBlock,
      history: data.history,
      message: data.message,
    });
  });

/* ------------------------------------------------------------------ */
/* Staff assistant — role-scoped, RLS-backed context only.             */
/* ------------------------------------------------------------------ */
export const askStaffAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    const { askAssistant } = await import("@/lib/ai/assistant.server");
    const supabase = context.supabase;

    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", context.userId),
      supabase.from("profiles").select("full_name, hotel_id").eq("id", context.userId).maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const audience =
      roles.find((r) => ["technician", "receptionist", "hotel_manager", "admin"].includes(r)) ??
      "receptionist";

    const lines: string[] = [`Signed-in user: ${profile?.full_name ?? "Staff"} (${audience}).`];

    if (audience === "technician") {
      const { data: technician } = await supabase
        .from("technicians")
        .select("id")
        .eq("profile_id", context.userId)
        .maybeSingle();

      if (technician) {
        const { data: jobs } = await supabase
          .from("tickets")
          .select("ticket_number, status, priority, description, location_text, is_escalated")
          .eq("assigned_technician_id", technician.id)
          .neq("status", "resolved")
          .order("created_at", { ascending: false })
          .limit(15);

        lines.push(`Open jobs assigned to this technician: ${jobs?.length ?? 0}`);
        for (const job of jobs ?? []) {
          lines.push(
            `- ${job.ticket_number}: ${statusLabel(job.status)}, ${priorityLabel(job.priority)}${
              job.is_escalated ? ", ESCALATED" : ""
            }, location ${job.location_text ?? "n/a"} — ${String(job.description).slice(0, 120)}`,
          );
        }
      } else {
        lines.push("No technician record is linked to this account yet.");
      }
    } else {
      // Receptionist / hotel manager / admin — RLS already limits rows to their org.
      const { data: tickets } = await supabase
        .from("tickets")
        .select(
          "ticket_number, status, priority, is_escalated, assigned_technician_id, description, location_text",
        )
        .order("created_at", { ascending: false })
        .limit(150);

      const rows = tickets ?? [];
      const open = rows.filter((t) => t.status !== "resolved");
      const unassigned = open.filter((t) => !t.assigned_technician_id);
      const escalated = open.filter((t) => t.is_escalated);
      const critical = open.filter((t) => t.priority === "critical");

      lines.push(
        `Ticket summary (most recent ${rows.length}): ${open.length} open, ${rows.length - open.length} resolved, ${unassigned.length} unassigned, ${escalated.length} escalated, ${critical.length} critical.`,
      );
      if (unassigned.length) {
        lines.push("Unassigned tickets:");
        for (const t of unassigned.slice(0, 10)) {
          lines.push(
            `- ${t.ticket_number}: ${priorityLabel(t.priority)}, ${statusLabel(t.status)}, location ${t.location_text ?? "n/a"} — ${String(t.description).slice(0, 100)}`,
          );
        }
      }
      if (escalated.length) {
        lines.push("Escalated tickets:");
        for (const t of escalated.slice(0, 10)) {
          lines.push(
            `- ${t.ticket_number}: ${priorityLabel(t.priority)}, ${statusLabel(t.status)} — ${String(t.description).slice(0, 100)}`,
          );
        }
      }
    }

    return askAssistant({
      audience,
      contextBlock: lines.join("\n"),
      history: data.history,
      message: data.message,
    });
  });
