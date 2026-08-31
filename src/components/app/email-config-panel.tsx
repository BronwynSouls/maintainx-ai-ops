import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleAlert, CircleCheck, Clock, Mail } from "lucide-react";
import { getEmailConfigStatus } from "@/lib/email-config.functions";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_META = {
  not_configured: {
    label: "Not Configured",
    icon: CircleAlert,
    className: "bg-destructive/10 text-destructive",
  },
  domain_pending: {
    label: "Domain Pending Verification",
    icon: Clock,
    className: "bg-status-pending text-status-pending-foreground",
  },
  active: {
    label: "Email Service Active",
    icon: CircleCheck,
    className: "bg-status-assigned text-status-assigned-foreground",
  },
} as const;

/** Read-only email delivery configuration for managers/admins. */
export function EmailConfigPanel() {
  const fetchStatus = useServerFn(getEmailConfigStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["email-config"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-56 w-full" />;
  if (!data?.ok) return null;

  const config = data.config;
  const meta = STATUS_META[config.status];
  const Icon = meta.icon;

  return (
    <section className="surface-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="size-4" aria-hidden /> Email configuration
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
        >
          <Icon className="size-3.5" aria-hidden /> {meta.label}
        </span>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Provider</dt>
          <dd className="font-medium">{config.provider}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Sender domain</dt>
          <dd className="font-medium">{config.senderDomain ?? "Not set"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Sender address</dt>
          <dd className="font-medium">{config.senderAddress ?? "Not set"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Display name</dt>
          <dd className="font-medium">{config.senderName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">API credentials</dt>
          <dd className="font-medium">{config.hasCredentials ? "Configured" : "Missing"}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        Credentials are stored as server-side environment variables only — they are never sent to
        the browser or saved in the database. Notifications (guest updates, technician assignment,
        receptionist assigned/unassigned alerts, status and resolution updates) are delivered as
        soon as the sender domain is verified. Until then nothing is reported as sent.
      </p>
    </section>
  );
}
