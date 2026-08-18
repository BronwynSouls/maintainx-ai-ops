import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    role: z.enum(["hotel_manager", "receptionist", "technician"]),
    hotelId: z.string().uuid().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    technicianType: z.enum(["in_house", "external"]).nullable().optional(),
    serviceIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.role !== "technician") {
      if (!value.hotelId) ctx.addIssue({ code: "custom", message: "A hotel must be selected." });
      return;
    }
    if (!value.technicianType)
      ctx.addIssue({ code: "custom", message: "Select whether you are in-house or outsourced." });
    if (value.technicianType === "in_house" && !value.hotelId)
      ctx.addIssue({ code: "custom", message: "In-house technicians must select a hotel." });
    if (value.technicianType === "external" && !value.companyId)
      ctx.addIssue({ code: "custom", message: "Outsourced technicians must select a company." });
    if (value.serviceIds.length === 0)
      ctx.addIssue({ code: "custom", message: "Select at least one service." });
  });

/** Creates the profile + role record right after a successful sign-up. */
export const completeSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isTechnician = data.role === "technician";
    const inHouse = isTechnician && data.technicianType === "in_house";
    const hotelId = isTechnician ? (inHouse ? (data.hotelId ?? null) : null) : (data.hotelId ?? null);
    const companyId = isTechnician && !inHouse ? (data.companyId ?? null) : null;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      full_name: data.fullName,
      email: (context.claims as { email?: string })?.email ?? null,
      hotel_id: hotelId,
      company_id: companyId,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    if (isTechnician) {
      const { data: technician, error: techError } = await supabaseAdmin
        .from("technicians")
        .upsert(
          {
            profile_id: context.userId,
            company_id: companyId,
            hotel_id: hotelId,
            technician_type: inHouse ? "in_house" : "external",
            full_name: data.fullName,
          },
          { onConflict: "profile_id" },
        )
        .select("id")
        .maybeSingle();
      if (techError) throw new Error(techError.message);

      if (technician && data.serviceIds.length > 0) {
        await supabaseAdmin.from("technician_services").delete().eq("technician_id", technician.id);
        const { error: servicesError } = await supabaseAdmin.from("technician_services").insert(
          data.serviceIds.map((serviceId) => ({
            technician_id: technician.id,
            service_id: serviceId,
          })),
        );
        if (servicesError) throw new Error(servicesError.message);
      }
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
