import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppNotification = {
  id: string;
  ticket_id: string | null;
  ticket_number: string | null;
  kind: string;
  title: string;
  message: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

/** Recent notifications for the signed-in user (their own rows only). */
export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("app_notifications")
      .select("id, ticket_id, ticket_number, kind, title, message, severity, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as AppNotification[];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("read_at", null);
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    return { ok: true as const };
  });

/** Marks notifications for one ticket read — used when the user opens it. */
export const markTicketNotificationsRead = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ ticketId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("ticket_id", data.ticketId)
      .is("read_at", null);
    return { ok: true as const };
  });
