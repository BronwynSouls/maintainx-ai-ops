/**
 * Modular AI service layer (server-only).
 *
 * Sprint 1 implements ticket classification only. Future sprints plug in
 * additional capabilities (AI replies, image analysis, transcription,
 * escalation, analytics) by adding functions here — no route or UI rewiring
 * is required because every consumer imports from this single module.
 */
import { CATEGORY_LABELS, CATEGORY_SLUGS } from "@/lib/domain";
import type { CategorySlug, TicketPriority } from "@/lib/domain";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const AI_MODEL = "google/gemini-3.5-flash";

export type ClassificationResult = {
  ok: true;
  categorySlug: CategorySlug;
  priority: TicketPriority;
  reason: string;
  confidence: number;
  model: string;
};

export type ClassificationFailure = {
  ok: false;
  error: string;
};

const SYSTEM_PROMPT = `You are the classification engine for MaintainX, a hotel maintenance operations platform.
Classify a reported maintenance issue into exactly one category and suggest a priority.

Categories (use the slug):
${CATEGORY_SLUGS.map((s) => `- ${s}: ${CATEGORY_LABELS[s]}`).join("\n")}

Priority guidance:
- critical: guest safety, flooding, no power/water, gas, fire, security or anything blocking room use.
- medium: broken or degraded equipment that affects comfort but the room remains usable.
- low: cosmetic, minor or convenience issues.

Respond with strict JSON only:
{"category":"<slug>","priority":"critical|medium|low","reason":"<one short sentence>","confidence":<0-1>}`;

function parseResult(raw: string): ClassificationResult | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const category = String(parsed["category"] ?? "").trim() as CategorySlug;
    const priority = String(parsed["priority"] ?? "").trim() as TicketPriority;
    if (!CATEGORY_SLUGS.includes(category)) return null;
    if (!["critical", "medium", "low"].includes(priority)) return null;
    const confidence = Number(parsed["confidence"]);
    return {
      ok: true,
      categorySlug: category,
      priority,
      reason: String(parsed["reason"] ?? "").slice(0, 400),
      confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.5,
      model: AI_MODEL,
    };
  } catch {
    return null;
  }
}

export async function classifyMaintenanceRequest(input: {
  description: string;
  location?: string | null;
  hotel?: string | null;
}): Promise<ClassificationResult | ClassificationFailure> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "AI service is not configured." };

  const userContent = [
    input.hotel ? `Property: ${input.hotel}` : null,
    input.location ? `Location: ${input.location}` : null,
    `Reported issue: ${input.description}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (response.status === 429) return { ok: false, error: "AI rate limit reached." };
      if (response.status === 402) return { ok: false, error: "AI credits exhausted." };
      return { ok: false, error: `AI request failed (${response.status}). ${detail.slice(0, 200)}` };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseResult(content);
    if (!parsed) return { ok: false, error: "AI returned an unreadable classification." };
    return parsed;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown AI failure.",
    };
  }
}

/* ------------------------------------------------------------------
 * Sprint 2 — AI generated staff/guest response.
 * ------------------------------------------------------------------ */
const RESPONSE_PROMPT = `You write short, professional maintenance updates for a hotel operations team.
Given a maintenance ticket, write ONE concise message (max 3 sentences) that staff can send to the guest or use internally.

Strict rules:
- Never claim the issue has been fixed unless the ticket status is "resolved".
- Never invent work that was carried out, parts used, or timelines that are not implied by the status.
- Acknowledge the issue, reflect the category, priority and current status, and state the next step.
- Plain text only, no greetings placeholders like [Name], no markdown.`;

export async function generateTicketResponse(input: {
  description: string;
  category: string;
  priority: string;
  status: string;
  location?: string | null;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "AI service is not configured." };

  const userContent = [
    `Issue: ${input.description}`,
    input.location ? `Location: ${input.location}` : null,
    `Category: ${input.category}`,
    `Priority: ${input.priority}`,
    `Current status: ${input.status}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: RESPONSE_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return { ok: false, error: "AI rate limit reached." };
      if (response.status === 402) return { ok: false, error: "AI credits exhausted." };
      return { ok: false, error: `AI request failed (${response.status}).` };
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const message = (payload.choices?.[0]?.message?.content ?? "").trim();
    if (!message) return { ok: false, error: "AI returned an empty response." };
    return { ok: true, message: message.slice(0, 1200) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown AI failure." };
  }
}

/* ------------------------------------------------------------------
 * Sprint 3+ extension points. Intentionally not implemented yet.
 * ------------------------------------------------------------------ */
export const aiCapabilities = {
  classification: true,
  suggestedResponses: true,
  autoAssignment: true,
  imageAnalysis: false,
  voiceTranscription: false,
  workflowAutomation: false,
  escalation: false,
  analytics: false,
} as const;
