/**
 * Email delivery configuration (server-only).
 *
 * All credentials live in server environment variables and are never exposed
 * to the browser or stored in the database. This module only reports a
 * redacted status and resolves the sender identity used for delivery.
 */

export type EmailConfigStatus = "not_configured" | "domain_pending" | "active";

export type EmailConfig = {
  status: EmailConfigStatus;
  provider: string;
  /** Verified sender domain, e.g. notify.example.com */
  senderDomain: string | null;
  /** Full from address, e.g. maintenance@notify.example.com */
  senderAddress: string | null;
  senderName: string;
  /** True when API credentials are present (never the value itself). */
  hasCredentials: boolean;
};

export function readEmailConfig(): EmailConfig {
  const apiKey = process.env["LOVABLE_API_KEY"] ?? "";
  const senderDomain = (process.env["EMAIL_SENDER_DOMAIN"] ?? "").trim() || null;
  const senderName = (process.env["EMAIL_SENDER_NAME"] ?? "").trim() || "MaintainX Maintenance";
  const localPart = (process.env["EMAIL_SENDER_LOCAL_PART"] ?? "").trim() || "maintenance";
  const verified = (process.env["EMAIL_DOMAIN_VERIFIED"] ?? "").trim().toLowerCase() === "true";

  const senderAddress = senderDomain ? `${localPart}@${senderDomain}` : null;
  const hasCredentials = apiKey.length > 0;

  let status: EmailConfigStatus = "not_configured";
  if (senderDomain && hasCredentials) status = verified ? "active" : "domain_pending";
  else if (senderDomain) status = "domain_pending";

  return {
    status,
    provider: "Lovable Managed Email",
    senderDomain,
    senderAddress,
    senderName,
    hasCredentials,
  };
}
