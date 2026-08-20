import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AnalyticsPoint = { label: string; value: number };

export type AnalyticsResult = {
  totals: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    critical: number;
    unassigned: number;
  };
  byCategory: AnalyticsPoint[];
  byStatus: AnalyticsPoint[];
  byPriority: AnalyticsPoint[];
  resolvedSplit: AnalyticsPoint[];
  overTime: AnalyticsPoint[];
  workload: { name: string; open: number; resolved: number }[];
  averages: { assignmentMinutes: number | null; resolutionMinutes: number | null };
  insights: string[];
  topLocations: AnalyticsPoint[];
};

const minutes = (from: string, to: string) =>
  (new Date(to).getTime() - new Date(from).getTime()) / 60000;

function tally(values: (string | null | undefined)[], fallback = "Unclassified") {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = value && value.trim() ? value : fallback;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalyticsResult> => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select(
        `id, status, priority, created_at, assigned_at, started_at, resolved_at,
         location_text, assigned_technician_id,
         maintenance_categories ( name ),
         hotel_locations ( name ),
         technicians ( id, full_name )`,
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const tickets = data ?? [];
    const resolved = tickets.filter((t) => t.status === "resolved");
    const open = tickets.filter((t) => t.status !== "resolved");

    const statusLabels: Record<string, string> = {
      new: "New",
      assigned: "Assigned",
      in_progress: "In Progress",
      pending: "Pending",
      scheduled: "Scheduled",
      resolved: "Resolved",
    };

    const byCategory = tally(tickets.map((t) => t.maintenance_categories?.name));
    const byStatus = tally(tickets.map((t) => statusLabels[t.status] ?? t.status));
    const byPriority = tally(
      tickets.map((t) => t.priority.charAt(0).toUpperCase() + t.priority.slice(1)),
    );
    const topLocations = tally(
      tickets.map((t) => t.hotel_locations?.name ?? t.location_text),
      "Unspecified",
    ).slice(0, 5);

    // Activity over the last 14 days
    const overTime: AnalyticsPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day.getTime() + 86_400_000);
      overTime.push({
        label: day.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        value: tickets.filter((t) => {
          const created = new Date(t.created_at);
          return created >= day && created < next;
        }).length,
      });
    }

    const workloadMap = new Map<string, { name: string; open: number; resolved: number }>();
    for (const ticket of tickets) {
      const tech = ticket.technicians;
      if (!tech) continue;
      const entry = workloadMap.get(tech.id) ?? { name: tech.full_name, open: 0, resolved: 0 };
      if (ticket.status === "resolved") entry.resolved += 1;
      else entry.open += 1;
      workloadMap.set(tech.id, entry);
    }
    const workload = [...workloadMap.values()].sort(
      (a, b) => b.open + b.resolved - (a.open + a.resolved),
    );

    const assignmentDurations = tickets
      .filter((t) => t.assigned_at)
      .map((t) => minutes(t.created_at, t.assigned_at as string))
      .filter((v) => v >= 0);
    const resolutionDurations = resolved
      .filter((t) => t.resolved_at)
      .map((t) => minutes(t.created_at, t.resolved_at as string))
      .filter((v) => v >= 0);
    const avg = (values: number[]) =>
      values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

    // --- Business insights (only when the data supports them) ---
    const insights: string[] = [];
    if (tickets.length < 3) {
      insights.push("Not enough maintenance data yet to identify reliable patterns.");
    } else {
      const topCategory = byCategory[0];
      if (topCategory && topCategory.label !== "Unclassified") {
        insights.push(
          `${topCategory.label} is the most common category (${topCategory.value} of ${tickets.length} tickets).`,
        );
      }
      const recurring = topLocations.find((l) => l.value >= 2 && l.label !== "Unspecified");
      if (recurring) {
        insights.push(`${recurring.label} has recurring reports (${recurring.value} tickets).`);
      }
      const criticalCount = tickets.filter((t) => t.priority === "critical").length;
      if (criticalCount > 0) {
        insights.push(
          `${Math.round((criticalCount / tickets.length) * 100)}% of tickets are critical priority.`,
        );
      }
      const stale = open.filter(
        (t) => Date.now() - new Date(t.created_at).getTime() > 3 * 86_400_000,
      );
      if (stale.length > 0) {
        insights.push(`${stale.length} ticket(s) have been open for more than 3 days.`);
      }
      const busiest = workload[0];
      if (busiest && workload.length > 1) {
        insights.push(
          `${busiest.name} carries the highest workload (${busiest.open} open, ${busiest.resolved} resolved).`,
        );
      }
      const unassigned = open.filter((t) => !t.assigned_technician_id).length;
      if (unassigned > 0) {
        insights.push(`${unassigned} open ticket(s) still have no technician assigned.`);
      }
    }

    return {
      totals: {
        total: tickets.length,
        open: open.length,
        inProgress: tickets.filter((t) => t.status === "in_progress").length,
        resolved: resolved.length,
        critical: tickets.filter((t) => t.priority === "critical").length,
        unassigned: open.filter((t) => !t.assigned_technician_id).length,
      },
      byCategory,
      byStatus,
      byPriority,
      resolvedSplit: [
        { label: "Resolved", value: resolved.length },
        { label: "Unresolved", value: open.length },
      ],
      overTime,
      workload,
      averages: {
        assignmentMinutes: avg(assignmentDurations),
        resolutionMinutes: avg(resolutionDurations),
      },
      insights,
      topLocations,
    };
  });