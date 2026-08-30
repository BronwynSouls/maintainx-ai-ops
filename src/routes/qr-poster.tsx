import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { QrPoster } from "@/components/app/qr-poster";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/qr-poster")({
  head: () => ({
    meta: [
      { title: "Guest Report QR Poster — MaintainX" },
      {
        name: "description",
        content:
          "Printable MaintainX QR poster for hotel rooms and reception areas. Guests scan to report maintenance issues.",
      },
      { property: "og:title", content: "Guest Report QR Poster — MaintainX" },
      {
        property: "og:description",
        content: "Scannable QR poster for in-room hotel maintenance reporting.",
      },
    ],
  }),
  component: QrPosterPage,
});

function QrPosterPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <QrPoster />
      </main>
    </div>
  );
}
