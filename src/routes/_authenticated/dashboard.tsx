import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Ticket as TicketIcon, Timer, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTickets } from "@/lib/tickets.functions";
import { formatDate, STATUS_META, STATUS_ORDER, type TicketStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MaintainX" },
      { name: "description", content: "Live maintenance ticket overview for your hotel." },
      { property: "og:title", content: "Dashboard — MaintainX" },
      { property: "og:description", content: "Live maintenance ticket overview for your hotel." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchTickets = useServerFn(listTickets);
  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => fetchTickets(),
  });

  const tickets = data ?? [];
  const open = tickets.filter((t) => t.status !== "resolved");
  const critical = open.filter((t) => t.priority === "critical");
  const resolvedToday = tickets.filter(
    (t) => t.resolved_at && new Date(t.resolved_at).toDateString() === new Date().toDateString(),
  );

  const cards = [
    { label: "Open tickets", value: open.length, icon: TicketIcon, tone: "text-brand" },
    { label: "Critical", value: critical.length, icon: AlertTriangle, tone: "text-priority-critical" },
    {
      label: "In progress",
      value: open.filter((t) => t.status === "in_progress").length,
      icon: Timer,
      tone: "text-status-in-progress",
    },
    {
      label: "Resolved today",
      value: resolvedToday.length,
      icon: CheckCircle2,
      tone: "text-status-resolved",
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Live maintenance activity across your properties"
      actions={
        <Button asChild size="sm">
          <Link to="/tickets">All tickets</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className={`size-4 ${card.tone}`} aria-hidden />
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-12" />
            ) : (
              <p className="mt-2 text-3xl font-bold tracking-tight">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="surface-panel lg:col-span-2">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Recent tickets</h2>
            <Link to="/tickets" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </header>
          <div className="divide-y divide-border">
            {isLoading && <div className="p-5"><Skeleton className="h-20 w-full" /></div>}
            {!isLoading && tickets.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">
                No tickets yet. Guest reports will appear here as soon as they are submitted.
              </p>
            )}
            {tickets.slice(0, 8).map((ticket) => (
              <Link
                key={ticket.id}
                to="/tickets/$ticketId"
                params={{ ticketId: ticket.id }}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{ticket.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {ticket.ticket_number} · {ticket.hotels?.name ?? "—"} ·{" "}
                    {ticket.hotel_locations?.name ?? ticket.location_text ?? "—"} ·{" "}
                    {formatDate(ticket.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-panel">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">By status</h2>
          </header>
          <ul className="divide-y divide-border">
            {STATUS_ORDER.map((status: TicketStatus) => (
              <li key={status} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-muted-foreground">{STATUS_META[status].label}</span>
                <span className="text-sm font-semibold">
                  {tickets.filter((t) => t.status === status).length}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
