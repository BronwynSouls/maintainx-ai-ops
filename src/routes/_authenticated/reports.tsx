import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MaintainX" },
      { name: "description", content: "Operational reporting and KPIs." },
      { property: "og:title", content: "Reports — MaintainX" },
      { property: "og:description", content: "Operational reporting and KPIs." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Reports"
      description="Operational reporting and KPIs"
      sprint="Sprint 4"
      points={[
        "Resolution time, SLA and backlog reporting",
        "Cost tracking per hotel and category",
        "Exportable management reports",
      ]}
    />
  ),
});
