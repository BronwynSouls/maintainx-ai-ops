/**
 * Shared domain vocabulary for MaintainX.
 * Sprint 1 focuses on hotels; the naming stays generic (organisation/location)
 * so apartments, property management and other industries can be added later.
 */

export type TicketStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "pending"
  | "scheduled"
  | "resolved";

export type TicketPriority = "critical" | "medium" | "low";

export type AppRole = "hotel_manager" | "receptionist" | "technician" | "admin";

export const STATUS_META: Record<
  TicketStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  new: {
    label: "New Ticket",
    badgeClass: "bg-status-new text-status-new-foreground border border-border",
    dotClass: "bg-status-new border border-border",
  },
  assigned: {
    label: "Assigned",
    badgeClass: "bg-status-assigned text-status-assigned-foreground",
    dotClass: "bg-status-assigned",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-status-in-progress text-status-in-progress-foreground",
    dotClass: "bg-status-in-progress",
  },
  pending: {
    label: "Pending",
    badgeClass: "bg-status-pending text-status-pending-foreground",
    dotClass: "bg-status-pending",
  },
  scheduled: {
    label: "Scheduled",
    badgeClass: "bg-status-scheduled text-status-scheduled-foreground",
    dotClass: "bg-status-scheduled",
  },
  resolved: {
    label: "Resolved",
    badgeClass: "bg-status-resolved text-status-resolved-foreground",
    dotClass: "bg-status-resolved",
  },
};

export const PRIORITY_META: Record<
  TicketPriority,
  { label: string; badgeClass: string }
> = {
  critical: {
    label: "Critical",
    badgeClass: "bg-priority-critical text-priority-critical-foreground",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-priority-medium text-priority-medium-foreground",
  },
  low: {
    label: "Low",
    badgeClass: "bg-priority-low text-priority-low-foreground",
  },
};

export const STATUS_ORDER: TicketStatus[] = [
  "new",
  "assigned",
  "in_progress",
  "pending",
  "scheduled",
  "resolved",
];

export const PRIORITY_ORDER: TicketPriority[] = ["critical", "medium", "low"];

export const ROLE_LABELS: Record<AppRole, string> = {
  hotel_manager: "Hotel Manager",
  receptionist: "Receptionist",
  technician: "Technician",
  admin: "Administrator",
};

/** Category slugs must match the maintenance_categories table. */
export const CATEGORY_SLUGS = [
  "plumbing",
  "electrical",
  "emergency_maintenance",
  "hvac",
  "general_maintenance",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  emergency_maintenance: "Emergency Maintenance",
  hvac: "HVAC / Air Conditioning",
  general_maintenance: "General Maintenance",
};


export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
