import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MaintainX" },
      { name: "description", content: "Workspace and account settings." },
      { property: "og:title", content: "Settings — MaintainX" },
      { property: "og:description", content: "Workspace and account settings." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Settings"
      description="Workspace and account settings"
      sprint="Sprint 2"
      points={[
        "Organisation profile, branding and locales",
        "Role and permission management",
        "Notification and escalation preferences",
      ]}
    />
  ),
});
