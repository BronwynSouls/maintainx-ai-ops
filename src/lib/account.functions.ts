import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signupSchema, updateProfileSchema } from "@/lib/account.server";

/** Creates the profile + role record right after a successful sign-up. */
export const completeSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isTechnician = data.role === "technician";
    const inHouse = isTechnician && data.technicianType === "in_house";
    const hotelId = isTechnician
      ? inHouse
        ? (data.hotelId ?? null)
        : null
      : (data.hotelId ?? null);
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

/** Provision account records saved during sign-up after email verification. */
export const provisionAccountFromMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    if (profile && (roles?.length ?? 0) > 0) return { ok: true, provisioned: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userResult, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      context.userId,
    );
    if (userError) throw new Error(userError.message);

    const metadata = (userResult.user?.user_metadata ?? {}) as Record<string, unknown>;
    const parsed = signupSchema.safeParse({
      fullName: metadata["full_name"] ?? "",
      role: metadata["signup_role"] ?? "",
      hotelId: metadata["hotel_id"] ?? null,
      companyId: metadata["company_id"] ?? null,
      technicianType: metadata["technician_type"] ?? null,
      serviceIds: Array.isArray(metadata["service_ids"]) ? metadata["service_ids"] : [],
    });
    if (!parsed.success) return { ok: false, provisioned: false };

    const account = parsed.data;
    const isTechnician = account.role === "technician";
    const inHouse = isTechnician && account.technicianType === "in_house";
    const hotelId = isTechnician
      ? inHouse
        ? (account.hotelId ?? null)
        : null
      : (account.hotelId ?? null);
    const companyId = isTechnician && !inHouse ? (account.companyId ?? null) : null;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      full_name: account.fullName,
      email: userResult.user?.email ?? null,
      hotel_id: hotelId,
      company_id: companyId,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: account.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    if (isTechnician) {
      const { data: technician, error: technicianError } = await supabaseAdmin
        .from("technicians")
        .upsert(
          {
            profile_id: context.userId,
            company_id: companyId,
            hotel_id: hotelId,
            technician_type: inHouse ? "in_house" : "external",
            full_name: account.fullName,
          },
          { onConflict: "profile_id" },
        )
        .select("id")
        .maybeSingle();
      if (technicianError) throw new Error(technicianError.message);

      if (technician && account.serviceIds.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from("technician_services")
          .delete()
          .eq("technician_id", technician.id);
        if (deleteError) throw new Error(deleteError.message);

        const { error: servicesError } = await supabaseAdmin.from("technician_services").insert(
          account.serviceIds.map((serviceId) => ({
            technician_id: technician.id,
            service_id: serviceId,
          })),
        );
        if (servicesError) throw new Error(servicesError.message);
      }
    }

    return { ok: true, provisioned: true };
  });

/** Current user's profile, role and organisation. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }, { data: technician }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, hotel_id, company_id, hotels(name), maintenance_companies(name)",
        )
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase
        .from("technicians")
        .select(
          "id, technician_type, is_available, technician_services ( maintenance_services ( slug, name ) )",
        )
        .eq("profile_id", context.userId)
        .maybeSingle(),
    ]);

    const services = (technician?.technician_services ?? [])
      .map((row) => row.maintenance_services)
      .filter((s): s is { slug: string; name: string } => Boolean(s));

    return {
      userId: context.userId,
      profile: profile ?? null,
      roles: (roles ?? []).map((r) => r.role),
      technician: technician ? { id: technician.id, type: technician.technician_type } : null,
      services,
    };
  });

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

/** Let the signed-in user update their own profile name and phone number. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateProfileSchema.parse(input))
  .handler(async ({ data, context }): Promise<UpdateProfileResult> => {
    // Technicians cannot rename themselves after account creation.
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r) => r.role);
    const isTechnician =
      roles.includes("technician") && !roles.includes("hotel_manager") && !roles.includes("admin");

    const patch: { phone: string | null; full_name?: string } = {
      phone: data.phone || null,
    };
    if (!isTechnician) patch.full_name = data.fullName;

    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
