import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/technicians")({
  head: () => ({
    meta: [
      { title: "Technicians — MaintainX" },
      { name: "description", content: "Maintenance technician roster and availability." },
      { property: "og:title", content: "Technicians — MaintainX" },
      { property: "og:description", content: "Maintenance technician roster and availability." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Technicians"
      description="Maintenance technician roster and availability"
      sprint="Sprint 2"
      points={[
        "Technician profiles, skills and shift availability",
        "Auto-assignment rules based on AI category and priority",
        "Workload and response-time tracking",
      ]}
    />
  ),
});
