/**
 * Server-only email delivery boundary for MaintainX.
 *
 * All app notifications (receptionist assignment alerts, technician job
 * alerts, guest ticket updates) funnel through `sendAppEmail`. Delivery uses
 * the configured email service (Lovable managed email) and only reports
 * `{ sent: true }` when the message was successfully handed to that service.
 *
 * Credentials come from server environment variables only — never the
 * frontend, never the database.
 */
import { readEmailConfig } from "./email-config.server";

export type SendResult = { sent: true } | { sent: false; reason: string };

export function isEmailConfigured() {
  return readEmailConfig().status === "active";
}

async function deliver(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  const config = readEmailConfig();
  if (config.status !== "active" || !config.senderDomain || !config.senderAddress) {
    return {
      sent: false,
      reason: config.status === "domain_pending" ? "domain_pending_verification" : "email_not_configured",
    };
  }

  const apiKey = process.env["LOVABLE_API_KEY"]!;
  const { sendLovableEmail } = await import("@lovable.dev/email-js");

  const html = `<!doctype html><html><body style="background:#ffffff;font-family:Arial,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#2563eb">MaintainX</p>
${input.body
    .split("\n")
    .map(
      (line) =>
        `<p style="margin:6px 0;font-size:14px;line-height:22px">${line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>`,
    )
    .join("")}
</div></body></html>`;

  await sendLovableEmail(
    {
      from: `${config.senderName} <${config.senderAddress}>`,
      sender_domain: config.senderDomain,
      to: input.to,
      subject: input.subject,
      html,
      text: input.body,
      purpose: "transactional",
      label: "maintainx-notification",
    },
    { apiKey },
  );

  return { sent: true };
}

export async function sendAppEmail(input: {
  to: string;
  subject: string;
  /** Plain-text body. */
  body: string;
}): Promise<SendResult> {
  if (!input.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) {
    return { sent: false, reason: "invalid_recipient" };
  }
  try {
    return await deliver(input);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "recipient_suppressed") return { sent: false, reason: "recipient_suppressed" };
    return { sent: false, reason: error instanceof Error ? error.message : "send_failed" };
  }
}
