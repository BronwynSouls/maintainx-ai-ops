import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, MessageSquareText, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getTicket, regenerateTicketResponse, updateTicket } from "@/lib/tickets.functions";
import { useAccount } from "@/hooks/useAccount";
import {
  formatDate,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/domain";


export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  head: () => ({
    meta: [
      { title: "Ticket detail — MaintainX" },
      { name: "description", content: "Full maintenance ticket detail, AI reasoning and activity." },
      { property: "og:title", content: "Ticket detail — MaintainX" },
      {
        property: "og:description",
        content: "Full maintenance ticket detail, AI reasoning and activity.",
      },
    ],
  }),
  component: TicketDetail,
});

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const fetchTicket = useServerFn(getTicket);
  const saveTicket = useServerFn(updateTicket);
  const regenerate = useServerFn(regenerateTicketResponse);
  const queryClient = useQueryClient();
  const { isTechnician, isManager, isReceptionist } = useAccount();


  const { data, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket({ data: { id: ticketId } }),
  });

  const mutation = useMutation({
    mutationFn: (patch: {
      status?: TicketStatus;
      priority?: TicketPriority;
      technicianId?: string | null;
    }) => saveTicket({ data: { id: ticketId, ...patch } }),
    onSuccess: () => {
      toast.success("Ticket updated");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const responseMutation = useMutation({
    mutationFn: () => regenerate({ data: { id: ticketId } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Suggested response updated");
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      } else {
        toast.error(result.error);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });


  if (isLoading) {
    return (
      <AppShell title="Ticket">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  const ticket = data?.ticket;
  if (!ticket) {
    return (
      <AppShell title="Ticket not found">
        <div className="surface-panel p-6">
          <p className="text-sm text-muted-foreground">
            This ticket doesn't exist or you don't have access to it.
          </p>
          <Link to="/tickets" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Back to tickets
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={ticket.ticket_number}
      description={ticket.hotels?.name ?? undefined}
      actions={
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="surface-panel p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.needs_manual_classification && (
                <span className="rounded-md bg-status-pending px-2 py-0.5 text-xs font-medium text-status-pending-foreground">
                  Needs manual classification
                </span>
              )}
            </div>
            <h2 className="mt-3 text-lg font-semibold">{ticket.title}</h2>
            <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
              {ticket.description}
            </p>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Location">
                {ticket.hotel_locations?.name ?? ticket.location_text ?? "—"}
              </Field>
              <Field label="Category">{ticket.maintenance_categories?.name ?? "Unclassified"}</Field>
              <Field label="Reported by">{ticket.reporter_type}</Field>
              <Field label="Input method">{ticket.input_method}</Field>
              <Field label="Reporter email">{ticket.reporter_email ?? "—"}</Field>
              <Field label="Created">{formatDate(ticket.created_at)}</Field>
            </dl>

            {data?.imageUrl && (
              <img
                src={data.imageUrl}
                alt={`Photo attached to ticket ${ticket.ticket_number}`}
                className="mt-5 max-h-80 rounded-lg border border-border object-contain"
              />
            )}
          </section>

          <section className="surface-panel p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden /> AI classification
            </h3>
            {ticket.ai_status === "classified" ? (
              <dl className="mt-3 space-y-2 text-sm">
                <Field label="Suggested category">
                  {ticket.maintenance_categories?.name ?? ticket.ai_category_slug}
                </Field>
                <Field label="Suggested priority">{ticket.ai_priority ?? "—"}</Field>
                <Field label="Reason">{ticket.ai_reason ?? "—"}</Field>
                <Field label="Confidence">
                  {ticket.ai_confidence != null ? `${Math.round(ticket.ai_confidence * 100)}%` : "—"}
                </Field>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {ticket.ai_reason ?? "AI classification is pending or unavailable for this ticket."}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              AI output is a recommendation. Staff can override the category, priority and status at
              any time.
            </p>
          </section>

          <section className="surface-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareText className="size-4 text-primary" aria-hidden /> AI suggested
                response
              </h3>
              <div className="flex gap-2">
                {ticket.ai_suggested_response && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(ticket.ai_suggested_response ?? "");
                      toast.success("Response copied");
                    }}
                  >
                    <Copy className="size-4" aria-hidden /> Copy
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={responseMutation.isPending}
                  onClick={() => responseMutation.mutate()}
                >
                  <RefreshCw className="size-4" aria-hidden />
                  {ticket.ai_suggested_response ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
              {ticket.ai_suggested_response ??
                "No suggested response yet — generate one based on the current ticket context."}
            </p>
            {ticket.ai_response_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Generated {formatDate(ticket.ai_response_at)} · review before sending to a guest.
              </p>
            )}
          </section>

          <section className="surface-panel">
            <header className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold">Status history</h3>
            </header>
            <ol className="divide-y divide-border">
              {(data?.statusHistory ?? []).map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-sm capitalize">
                    {entry.from_status ? `${entry.from_status.replace("_", " ")} → ` : ""}
                    <span className="font-medium">{entry.to_status.replace("_", " ")}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.changed_by_label ?? "System"} · {formatDate(entry.created_at)}
                  </p>
                </li>
              ))}
              {(data?.statusHistory ?? []).length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">
                  No status changes recorded yet.
                </li>
              )}
            </ol>
          </section>



          <section className="surface-panel">
            <header className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold">Activity</h3>
            </header>
            <ol className="divide-y divide-border">
              {(data?.activity ?? []).map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-sm">{entry.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.actor_label ?? "System"} · {formatDate(entry.created_at)}
                  </p>
                </li>
              ))}
              {(data?.activity ?? []).length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">No activity yet.</li>
              )}
            </ol>
          </section>
        </div>

        <aside className="surface-panel h-fit space-y-4 p-5">
          <h3 className="text-sm font-semibold">Manage ticket</h3>

          {isTechnician && !isManager && (
            <div className="flex flex-wrap gap-2">
              {ticket.status !== "in_progress" && ticket.status !== "resolved" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ status: "in_progress" })}
                >
                  Start work
                </Button>
              )}
              {ticket.status !== "resolved" && (
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ status: "resolved" })}
                >
                  Mark resolved
                </Button>
              )}
            </div>
          )}


          <div className="space-y-2">
            <Label htmlFor="ticket-status">Status</Label>
            <Select
              value={ticket.status}
              onValueChange={(v) => mutation.mutate({ status: v as TicketStatus })}
            >
              <SelectTrigger id="ticket-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-priority">Priority</Label>
            <Select
              value={ticket.priority}
              onValueChange={(v) => mutation.mutate({ priority: v as TicketPriority })}
            >
              <SelectTrigger id="ticket-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p[0]?.toUpperCase()}
                    {p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isReceptionist ? (
          <div className="space-y-2">
            <Label htmlFor="ticket-tech">Assigned technician</Label>
            <Select
              value={ticket.assigned_technician_id ?? ""}
              onValueChange={(v) => mutation.mutate({ technicianId: v || null })}
            >
              <SelectTrigger id="ticket-tech">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {(data?.technicians ?? []).map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name}
                    {tech.specialty ? ` — ${tech.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only receptionists can assign or reassign tickets. AI assigns automatically where a
              suitable available technician exists.
            </p>
          </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Assigned technician</p>
              <p className="text-sm font-medium">
                {ticket.technicians?.full_name ?? "Unassigned"}
              </p>
              <p className="text-xs text-muted-foreground">
                Only receptionists can assign or reassign tickets.
              </p>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize">{children}</dd>
    </div>
  );
}
