import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MapPin } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { MaintenanceRequestForm } from "@/components/app/maintenance-request-form";
import { resolveQrCode } from "@/lib/directory.functions";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/report/$code")({
  head: () => ({
    meta: [
      { title: "Report an issue in this room — MaintainX" },
      {
        name: "description",
        content:
          "Scanned QR reporting: the room is pre-filled, just describe the maintenance problem.",
      },
      { property: "og:title", content: "Report an issue in this room — MaintainX" },
      {
        property: "og:description",
        content: "Scan-to-report hotel maintenance by MaintainX Consulting Group.",
      },
    ],
  }),
  component: QrReport,
});

function QrReport() {
  const { code } = Route.useParams();
  const resolve = useServerFn(resolveQrCode);
  const { data, isLoading } = useQuery({
    queryKey: ["qr", code],
    queryFn: () => resolve({ data: { code } }),
  });

  const location = data?.location;
  const hotel = location?.hotels as { id: string; name: string; city: string | null } | null;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/">
            <Brand />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ArrowLeft className="size-4" aria-hidden /> Back to Home
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("guest.title")}</h1>
          {isLoading ? (
            <p className="mt-1 text-sm text-muted-foreground">Loading your room details…</p>
          ) : location ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 text-brand" aria-hidden />
              {hotel?.name} · {location.name}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              We couldn't recognise that QR code — please select your hotel and room below.
            </p>
          )}
        </div>
        <MaintenanceRequestForm
          reporterType="guest"
          presetHotelId={location?.hotel_id ?? null}
          presetLocationId={location?.id ?? null}
        />
        <p className="text-xs text-muted-foreground">{t("guest.noPhone")}</p>
      </main>
    </div>
  );
}
