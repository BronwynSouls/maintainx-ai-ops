/**
 * In-app notification dispatch (server-only).
 *
 * Rows land in `app_notifications` and are streamed to the recipient over
 * Realtime. Every row carries a `dedupe_key`, and the unique index on
 * (user_id, dedupe_key) guarantees the same event never notifies twice.
 */

export type NotificationKind =
  | "ai_assigned"
  | "unassigned"
  | "escalation"
  | "handback"
  | "critical"
  | "new_job";

export type NotificationSeverity = "info" | "warning" | "critical";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Auth user ids of everyone holding `role` at the given hotel. */
export async function userIdsForRole(
  hotelId: string,
  role: "receptionist" | "hotel_manager",
): Promise<string[]> {
  const db = await admin();
  const { data: roles } = await db.from("user_roles").select("user_id").eq("role", role);
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, hotel_id")
    .in("id", ids)
    .eq("hotel_id", hotelId);
  return (profiles ?? []).map((p) => p.id);
}

export async function pushNotification(input: {
  userIds: string[];
  ticketId?: string | null;
  ticketNumber?: string | null;
  kind: NotificationKind;
  title: string;
  message?: string | null;
  severity?: NotificationSeverity;
  dedupeKey: string;
}) {
  const recipients = [...new Set(input.userIds.filter(Boolean))];
  if (recipients.length === 0) return;
  const db = await admin();
  await db.from("app_notifications").upsert(
    recipients.map((user_id) => ({
      user_id,
      ticket_id: input.ticketId ?? null,
      ticket_number: input.ticketNumber ?? null,
      kind: input.kind,
      title: input.title,
      message: input.message ?? null,
      severity: input.severity ?? "info",
      dedupe_key: input.dedupeKey,
    })),
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
  );
}
