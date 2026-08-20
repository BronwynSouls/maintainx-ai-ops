import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Mail, MapPin, Phone, Users } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { listClients } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — MaintainX" },
      { name: "description", content: "Hotel clients and maintenance companies." },
      { property: "og:title", content: "Clients — MaintainX" },
      { property: "og:description", content: "Hotel clients and maintenance companies." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const fetchClients = useServerFn(listClients);
  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const clients = data ?? [];

  return (
    <AppShell title="Clients" description="Organisations MaintainX currently serves">
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : clients.length === 0 ? (
        <div className="surface-panel p-6 text-sm text-muted-foreground">
          No active organisations are registered yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <article key={client.id} className="surface-panel space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{client.name}</h2>
                  <p className="mt-0.5 text-xs font-medium tracking-wide text-primary uppercase">
                    {client.type}
                  </p>
                </div>
                <Building2 className="size-5 shrink-0 text-brand" aria-hidden />
              </div>
              <dl className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{client.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{client.phone ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{client.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0" aria-hidden />
                  <span>{client.technicianCount ?? 0} technician(s)</span>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
