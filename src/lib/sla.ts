/**
 * SLA targets for MaintainX tickets (client-safe).
 *
 * Targets apply only to tickets created after the escalation workflow was
 * introduced (`sla_tracked = true`). Existing/resolved tickets are untouched.
 */
import type { TicketPriority } from "@/lib/domain";

export const SLA_TARGETS: Record<
  TicketPriority,
  { assignMinutes: number; resolveMinutes: number }
> = {
  critical: { assignMinutes: 30, resolveMinutes: 4 * 60 },
  medium: { assignMinutes: 2 * 60, resolveMinutes: 12 * 60 },
  low: { assignMinutes: 4 * 60, resolveMinutes: 24 * 60 },
};

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}

/** Human label such as "in 42 min" / "overdue by 2.0 h". */
export function slaCountdown(dueAt: string | null | undefined, now: Date = new Date()) {
  if (!dueAt) return null;
  const diffMs = new Date(dueAt).getTime() - now.getTime();
  const minutes = Math.round(Math.abs(diffMs) / 60000);
  return {
    overdue: diffMs < 0,
    label: diffMs < 0 ? `overdue by ${formatDuration(minutes)}` : `in ${formatDuration(minutes)}`,
  };
}
