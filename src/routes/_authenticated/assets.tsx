import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({
    meta: [
      { title: "Assets — MaintainX" },
      { name: "description", content: "Equipment and asset register." },
      { property: "og:title", content: "Assets — MaintainX" },
      { property: "og:description", content: "Equipment and asset register." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Assets"
      description="Equipment and asset register"
      sprint="Sprint 3"
      points={[
        "Asset register per hotel with QR tagging",
        "Maintenance history linked to tickets",
        "Warranty and replacement planning",
      ]}
    />
  ),
});
