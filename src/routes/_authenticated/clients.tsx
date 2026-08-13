import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — MaintainX" },
      { name: "description", content: "Hotel clients and maintenance companies." },
      { property: "og:title", content: "Clients — MaintainX" },
      { property: "og:description", content: "Hotel clients and maintenance companies." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Clients"
      description="Hotel clients and maintenance companies"
      sprint="Sprint 2"
      points={[
        "Hotel and company onboarding with contract details",
        "Per-client SLA targets and escalation contacts",
        "QR code generation per room and public area",
      ]}
    />
  ),
});
