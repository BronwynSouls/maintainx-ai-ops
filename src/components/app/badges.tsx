import { cn } from "@/lib/utils";
import { PRIORITY_META, STATUS_META, type TicketPriority, type TicketStatus } from "@/lib/domain";

/** Status is never conveyed by colour alone — the label is always rendered. */
export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.badgeClass,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full bg-current opacity-70")} aria-hidden />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

/**
 * Escalation flag. This is NOT a status — the ticket keeps its own status and
 * this badge is rendered alongside it.
 */
export function EscalatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-priority-critical bg-priority-critical/10 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-priority-critical",
        className,
      )}
      title="This ticket breached an SLA target or was returned by a technician"
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      Escalated
    </span>
  );
}
