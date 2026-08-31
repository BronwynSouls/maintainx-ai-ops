import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Redacted email configuration status for authorised staff.
 * Only managers/admins may read it, and no credential value is ever returned.
 */
export const getEmailConfigStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const allowed = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "hotel_manager",
    );
    if (!allowed) return { ok: false as const, error: "Not authorised" };

    const { readEmailConfig } = await import("./email-config.server");
    return { ok: true as const, error: null, config: readEmailConfig() };
  });
