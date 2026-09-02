import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EscalatedBadge, PriorityBadge, StatusBadge } from "@/components/app/badges";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTickets, runSlaEscalationCheck } from "@/lib/tickets.functions";
import {
  formatDate,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/tickets/")({
  head: () => ({
    meta: [
      { title: "Tickets — MaintainX" },
      { name: "description", content: "Search, filter and triage every maintenance ticket." },
      { property: "og:title", content: "Tickets — MaintainX" },
      {
        property: "og:description",
        content: "Search, filter and triage every maintenance ticket.",
      },
    ],
  }),
  component: TicketsPage,
});

function TicketsPage() {
  const fetchTickets = useServerFn(listTickets);
  const runSlaCheck = useServerFn(runSlaEscalationCheck);
  // Run the SLA sweep first so breached tickets are flagged in this list.
  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      await runSlaCheck().catch(() => undefined);
      return fetchTickets();
    },
  });


  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");

  const tickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((ticket) => {
      if (status !== "all" && ticket.status !== status) return false;
      if (priority !== "all" && ticket.priority !== priority) return false;
      if (!term) return true;
      return [
        ticket.ticket_number,
        ticket.title,
        ticket.description,
        ticket.hotels?.name,
        ticket.hotel_locations?.name,
        ticket.location_text,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data, search, status, priority]);

  return (
    <AppShell title="Tickets" description="Every maintenance request, newest first">
      <div className="surface-panel p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search ticket number, description, hotel or room"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tickets"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="sm:w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger className="sm:w-40" aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {p[0]?.toUpperCase()}
                  {p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface-panel mt-5 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No tickets match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Ticket</th>
                  <th scope="col" className="px-4 py-3 font-medium">Location</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 font-medium">Priority</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        to="/tickets/$ticketId"
                        params={{ ticketId: ticket.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {ticket.ticket_number}
                      </Link>
                      <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                        {ticket.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ticket.hotels?.name ?? "—"}
                      <span className="block text-xs">
                        {ticket.hotel_locations?.name ?? ticket.location_text ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {ticket.maintenance_categories?.name ?? (
                          <span className="text-muted-foreground">Unclassified</span>
                        )}
                        {ticket.ai_status === "classified" && (
                          <Sparkles className="size-3 text-primary" aria-label="AI classified" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={ticket.status} />
                        {ticket.is_escalated && <EscalatedBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
