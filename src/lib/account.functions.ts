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
  .validator((input: unknown) => signupSchema.parse(input))
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

/**
 * Provisions profile/role/technician records from the sign-up metadata that was
 * stored on the auth user. Used after email verification, when the account was
 * created without an immediate session.
 */
export const provisionAccountFromMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (existing) return { ok: true, provisioned: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = (userRes?.user?.user_metadata ?? {}) as Record<string, unknown>;

    const parsed = signupSchema.safeParse({
      fullName: meta["full_name"] ?? "",
      role: meta["signup_role"] ?? "",
      hotelId: meta["hotel_id"] ?? null,
      companyId: meta["company_id"] ?? null,
      technicianType: meta["technician_type"] ?? null,
      serviceIds: Array.isArray(meta["service_ids"]) ? meta["service_ids"] : [],
    });
    if (!parsed.success) return { ok: false, provisioned: false };

    const data = parsed.data;
    const isTechnician = data.role === "technician";
    const inHouse = isTechnician && data.technicianType === "in_house";
    const hotelId = isTechnician ? (inHouse ? (data.hotelId ?? null) : null) : (data.hotelId ?? null);
    const companyId = isTechnician && !inHouse ? (data.companyId ?? null) : null;

    await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      full_name: data.fullName,
      email: userRes?.user?.email ?? null,
      hotel_id: hotelId,
      company_id: companyId,
    });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: data.role }, { onConflict: "user_id,role" });

    if (isTechnician) {
      const { data: technician } = await supabaseAdmin
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
      if (technician && data.serviceIds.length > 0) {
        await supabaseAdmin.from("technician_services").delete().eq("technician_id", technician.id);
        await supabaseAdmin.from("technician_services").insert(
          data.serviceIds.map((serviceId) => ({ technician_id: technician.id, service_id: serviceId })),
        );
      }
    }

    return { ok: true, provisioned: true };
  });

/** Current user's profile, role and organisation. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, email, phone, hotel_id, company_id, hotels(name), maintenance_companies(name)")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    const roleList = (roles ?? []).map((r) => r.role);

    // Registered maintenance services (read-only for technicians).
    let services: string[] = [];
    if (roleList.includes("technician")) {
      const { data: technician } = await context.supabase
        .from("technicians")
        .select("id, technician_services ( maintenance_services ( name ) )")
        .eq("profile_id", context.userId)
        .maybeSingle();
      services = (technician?.technician_services ?? [])
        .map((link) => link.maintenance_services?.name)
        .filter((name): name is string => Boolean(name));
    }

    return {
      userId: context.userId,
      profile: profile ?? null,
      roles: roleList,
      services,
    };
  });

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

/** Let the signed-in user update their own profile name and phone number. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateProfileSchema.parse(input))
  .handler(async ({ data, context }): Promise<UpdateProfileResult> => {
    // Technicians cannot change their full name after account creation.
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isTechnician = (roles ?? []).some((r) => r.role === "technician");

    const patch: { phone: string | null; full_name?: string } = { phone: data.phone || null };
    if (!isTechnician) patch.full_name = data.fullName;

    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
