import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { listTechnicians } from "@/lib/technicians.functions";

export const Route = createFileRoute("/_authenticated/technicians")({
  head: () => ({
    meta: [
      { title: "Technicians — MaintainX" },
      { name: "description", content: "Maintenance technician roster and availability." },
      { property: "og:title", content: "Technicians — MaintainX" },
      { property: "og:description", content: "Maintenance technician roster and availability." },
    ],
  }),
  component: TechniciansPage,
});

function TechniciansPage() {
  const fetchTechnicians = useServerFn(listTechnicians);
  const { data, isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => fetchTechnicians(),
  });
  const technicians = data ?? [];

  return (
    <AppShell
      title="Technicians"
      description="Roster, registered services, availability and workload"
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : technicians.length === 0 ? (
        <div className="surface-panel p-6 text-sm text-muted-foreground">
          No technicians registered yet.
        </div>
      ) : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Technician</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Organisation</th>
                <th className="px-5 py-3 font-medium">Services</th>
                <th className="px-5 py-3 font-medium">Availability</th>
                <th className="px-5 py-3 text-right font-medium">Open</th>
                <th className="px-5 py-3 text-right font-medium">Resolved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {technicians.map((tech) => (
                <tr key={tech.id}>
                  <td className="px-5 py-3 font-medium">{tech.fullName}</td>
                  <td className="px-5 py-3 capitalize">{tech.type.replace("_", "-")}</td>
                  <td className="px-5 py-3 text-muted-foreground">{tech.organisation}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tech.services.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        tech.services.map((service) => (
                          <span
                            key={service}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                          >
                            {service}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        tech.isActive && tech.isAvailable
                          ? "rounded-md bg-status-resolved px-2 py-0.5 text-xs font-medium text-status-resolved-foreground"
                          : "rounded-md bg-status-pending px-2 py-0.5 text-xs font-medium text-status-pending-foreground"
                      }
                    >
                      {tech.isActive && tech.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{tech.openTickets}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {tech.resolvedTickets}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
