import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI — MaintainX" },
      { name: "description", content: "AI operations and model insight." },
      { property: "og:title", content: "AI — MaintainX" },
      { property: "og:description", content: "AI operations and model insight." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="AI"
      description="AI operations and model insight"
      sprint="Sprint 3"
      points={[
        "Classification accuracy monitoring and manual overrides",
        "Predictive maintenance from recurring ticket patterns",
        "Automated guest and staff notifications",
      ]}
    />
  ),
});
