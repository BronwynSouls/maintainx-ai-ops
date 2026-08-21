import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMySchedule } from "@/lib/technicians.functions";
import { updateTicket } from "@/lib/tickets.functions";
import { formatDate, type TicketStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "My Jobs — MaintainX" },
      { name: "description", content: "Maintenance jobs assigned to you and their progress." },
      { property: "og:title", content: "My Jobs — MaintainX" },
      {
        property: "og:description",
        content: "Maintenance jobs assigned to you and their progress.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const fetchSchedule = useServerFn(getMySchedule);
  const saveTicket = useServerFn(updateTicket);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-schedule"],
    queryFn: () => fetchSchedule(),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; status: TicketStatus }) =>
      saveTicket({ data: { id: input.id, status: input.status } }),
    onSuccess: () => {
      toast.success("Job updated");
      queryClient.invalidateQueries({ queryKey: ["my-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tickets = data?.tickets ?? [];
  const open = tickets.filter((t) => t.status !== "resolved");
  const done = tickets.filter((t) => t.status === "resolved");

  return (
    <AppShell title="My Jobs" description="Maintenance jobs assigned to you">
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data?.technician ? (
        <div className="surface-panel p-6 text-sm text-muted-foreground">
          Your account is not linked to a technician profile, so no jobs are assigned to you.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Open jobs" value={open.length} />
            <Metric
              label="In progress"
              value={tickets.filter((t) => t.status === "in_progress").length}
            />
            <Metric label="Resolved" value={done.length} />
          </div>

          <section className="surface-panel">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Active jobs</h2>
            </header>
            <div className="divide-y divide-border">
              {open.length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">
                  You have no active jobs right now.
                </p>
              )}
              {open.map((ticket) => (
                <div key={ticket.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/tickets/$ticketId"
                        params={{ ticketId: ticket.id }}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {ticket.title ?? ticket.ticket_number}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ticket.ticket_number} · {ticket.hotels?.name ?? "—"} ·{" "}
                        {ticket.hotel_locations?.name ?? ticket.location_text ?? "—"} ·{" "}
                        {ticket.maintenance_categories?.name ?? "Unclassified"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Assigned {formatDate(ticket.assigned_at)}
                        {ticket.started_at ? ` · Started ${formatDate(ticket.started_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ticket.status !== "in_progress" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ id: ticket.id, status: "in_progress" })}
                      >
                        Start work
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ id: ticket.id, status: "resolved" })}
                    >
                      Mark resolved
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-panel">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Completed</h2>
            </header>
            <ul className="divide-y divide-border">
              {done.length === 0 && (
                <li className="p-5 text-sm text-muted-foreground">Nothing completed yet.</li>
              )}
              {done.slice(0, 15).map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/tickets/$ticketId"
                      params={{ ticketId: ticket.id }}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {ticket.title ?? ticket.ticket_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Resolved {formatDate(ticket.resolved_at)}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-panel p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
