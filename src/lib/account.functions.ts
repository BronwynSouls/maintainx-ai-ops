import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["hotel_manager", "receptionist", "technician"]),
  hotelId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
});

/** Creates the profile + role record right after a successful sign-up. */
export const completeSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isTechnician = data.role === "technician";

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      full_name: data.fullName,
      email: (context.claims as { email?: string })?.email ?? null,
      hotel_id: isTechnician ? null : (data.hotelId ?? null),
      company_id: isTechnician ? (data.companyId ?? null) : null,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    if (isTechnician) {
      await supabaseAdmin.from("technicians").upsert(
        {
          profile_id: context.userId,
          company_id: data.companyId ?? null,
          full_name: data.fullName,
        },
        { onConflict: "profile_id" },
      );
    }

    return { ok: true };
  });

/** Current user's profile, role and organisation. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, email, hotel_id, company_id, hotels(name), maintenance_companies(name)")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    return {
      userId: context.userId,
      profile: profile ?? null,
      roles: (roles ?? []).map((r) => r.role),
    };
  });
