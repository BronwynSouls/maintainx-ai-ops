import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — MaintainX" },
      { name: "description", content: "Planned and preventive maintenance." },
      { property: "og:title", content: "Schedule — MaintainX" },
      { property: "og:description", content: "Planned and preventive maintenance." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Schedule"
      description="Planned and preventive maintenance"
      sprint="Sprint 3"
      points={[
        "Preventive maintenance calendar per asset",
        "Technician scheduling and route planning",
        "Recurring inspection checklists",
      ]}
    />
  ),
});
