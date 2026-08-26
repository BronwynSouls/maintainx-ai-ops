import { z } from "zod";

export const signupSchema = z
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

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});
