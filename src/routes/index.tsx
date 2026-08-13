import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, QrCode, ShieldCheck, Wrench } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaintainX Consulting Group — AI Hotel Maintenance Operations" },
      {
        name: "description",
        content:
          "Guests report hotel maintenance issues by QR code. AI classifies every ticket and routes it to the right technician.",
      },
      { property: "og:title", content: "MaintainX Consulting Group" },
      {
        property: "og:description",
        content:
          "AI-powered maintenance ticketing for hotels: QR guest reporting, automatic classification and technician dispatch.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: QrCode,
    title: "Guest QR reporting",
    body: "Guests scan the QR code in their room and report an issue in seconds — no app, no account.",
  },
  {
    icon: Bot,
    title: "AI classification",
    body: "Every request is categorised and given a suggested priority, with the reasoning shown to the team.",
  },
  {
    icon: Wrench,
    title: "Technician dispatch",
    body: "Tickets flow into one operational board where managers assign, track and resolve the work.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Staff login</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="bg-hero">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold tracking-[0.2em] text-azure uppercase">
              Business Operations Platform
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Hotel maintenance, reported in seconds and resolved with AI.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-white/70">
              MaintainX Consulting Group connects hotel guests, reception teams and maintenance
              technicians on one continuous operations platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="brand">
                <Link to="/report">
                  {t("guest.title")} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="onDark">
                <Link to="/auth">Staff sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="surface-panel p-6">
                <feature.icon className="size-6 text-brand" aria-hidden />
                <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>

          <div className="surface-panel mt-8 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 text-status-resolved" aria-hidden />
              <p className="max-w-xl text-sm text-muted-foreground">{t("guest.noPhone")}</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/report">Open the guest report form</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} MaintainX Consulting Group. All rights reserved.</p>
          <p>Sprint 1 — foundation release</p>
        </div>
      </footer>
    </div>
  );
}
