import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAiTickets, updateTicket } from "@/lib/tickets.functions";
import { useAccount } from "@/hooks/useAccount";
import { formatDate, type TicketStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI — MaintainX" },
      { name: "description", content: "AI-assigned tickets and technician assignments." },
      { property: "og:title", content: "AI — MaintainX" },
      { property: "og:description", content: "AI-assigned tickets and technician assignments." },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const fetchTickets = useServerFn(listAiTickets);
  const saveTicket = useServerFn(updateTicket);
  const queryClient = useQueryClient();
  const { isTechnician, isManager, isReceptionist } = useAccount();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-tickets"],
    queryFn: () => fetchTickets(),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; status: TicketStatus }) =>
      saveTicket({ data: { id: input.id, status: input.status } }),
    onSuccess: () => {
      toast.success("Ticket updated");
      queryClient.invalidateQueries({ queryKey: ["ai-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tickets = data ?? [];
  const classified = tickets.filter((t) => t.ai_status === "classified");
  const unclassified = tickets.filter((t) => t.ai_status !== "classified");

  const subtitle = isTechnician
    ? "Update the progress of your assigned maintenance work"
    : "View AI-assigned tickets and their assigned technicians";

  return (
    <AppShell title="AI" description={subtitle}>
      <div className="surface-panel mb-5 flex items-center gap-3 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="size-5 text-primary" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Ticket Classification & Assignment</p>
          <p className="text-xs text-muted-foreground">
            {classified.length} classified · {unclassified.length} pending or unclassified
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : tickets.length === 0 ? (
        <div className="surface-panel p-6 text-sm text-muted-foreground">
          {isTechnician
            ? "No tickets have been assigned to you yet."
            : "No AI-classified tickets yet. Tickets will appear here once guests report issues."}
        </div>
      ) : (
        <div className="space-y-4">
          {classified.length > 0 && (
            <section className="surface-panel">
              <header className="border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" aria-hidden />
                  AI-classified tickets
                </h2>
              </header>
              <div className="divide-y divide-border">
                {classified.map((ticket) => (
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
                          {ticket.hotel_locations?.name ?? ticket.location_text ?? "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          AI category: {ticket.maintenance_categories?.name ?? ticket.ai_category_slug ?? "—"}
                          {ticket.ai_reason ? ` · ${ticket.ai_reason}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PriorityBadge priority={ticket.priority} />
                        <StatusBadge status={ticket.status} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Technician:</span>{" "}
                        {ticket.technicians?.full_name ?? "Unassigned"}
                        {ticket.technicians?.technician_type && (
                          <span className="ml-1 capitalize">
                            ({ticket.technicians.technician_type.replace("_", "-")})
                          </span>
                        )}
                        {ticket.assigned_at && (
                          <span className="ml-2">· Assigned {formatDate(ticket.assigned_at)}</span>
                        )}
                      </div>

                      {isTechnician && (
                        <div className="flex flex-wrap gap-2">
                          {ticket.status !== "in_progress" && ticket.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={mutation.isPending}
                              onClick={() => mutation.mutate({ id: ticket.id, status: "in_progress" })}
                            >
                              Start work
                            </Button>
                          )}
                          {ticket.status !== "resolved" && (
                            <Button
                              size="sm"
                              disabled={mutation.isPending}
                              onClick={() => mutation.mutate({ id: ticket.id, status: "resolved" })}
                            >
                              Mark resolved
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {unclassified.length > 0 && !isTechnician && (
            <section className="surface-panel">
              <header className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold">Pending classification</h2>
              </header>
              <div className="divide-y divide-border">
                {unclassified.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <Link
                        to="/tickets/$ticketId"
                        params={{ ticketId: ticket.id }}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {ticket.title ?? ticket.ticket_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {ticket.ticket_number} · {formatDate(ticket.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
