/**
 * Server-only email delivery boundary for MaintainX.
 *
 * All app notifications (receptionist assignment alerts, guest ticket
 * updates) funnel through `sendAppEmail`. Delivery uses Lovable's managed
 * email infrastructure, which requires a verified sender domain for the
 * project. Until that domain is configured the helper resolves with
 * `{ sent: false, reason: "email_not_configured" }` so notification logic
 * keeps working end-to-end and nothing throws.
 *
 * When the sender domain is verified, swap the body of `deliver()` for a
 * `sendTemplateEmail(...)` call — no call site needs to change.
 */

export type SendResult = { sent: true } | { sent: false; reason: string };

export function isEmailConfigured() {
  return false;
}

async function deliver(_input: { to: string; subject: string; body: string }): Promise<SendResult> {
  return { sent: false, reason: "email_not_configured" };
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
    return { sent: false, reason: error instanceof Error ? error.message : "send_failed" };
  }
}
