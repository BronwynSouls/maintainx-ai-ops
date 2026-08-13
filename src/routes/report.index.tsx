import { createFileRoute, Link } from "@tanstack/react-router";
import { Brand } from "@/components/app/brand";
import { MaintenanceRequestForm } from "@/components/app/maintenance-request-form";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/report/")({
  head: () => ({
    meta: [
      { title: "Report a maintenance issue — MaintainX" },
      {
        name: "description",
        content:
          "Report a hotel maintenance problem in seconds. Describe it, speak it or send a photo — no account required.",
      },
      { property: "og:title", content: "Report a maintenance issue — MaintainX" },
      {
        property: "og:description",
        content: "Guest maintenance reporting for hotels, powered by MaintainX Consulting Group.",
      },
    ],
  }),
  component: GuestReport,
});

function GuestReport() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/">
            <Brand />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("guest.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("guest.subtitle")}</p>
        </div>
        <MaintenanceRequestForm reporterType="guest" />
        <p className="text-xs text-muted-foreground">{t("guest.noPhone")}</p>
      </main>
    </div>
  );
}
