/**
 * Minimal translation layer. Sprint 1 ships English only, but every guest-facing
 * string goes through t() so future sprints can add locales without refactoring.
 */
const en = {
  "guest.title": "Report a maintenance issue",
  "guest.subtitle": "No account needed — tell us what needs fixing.",
  "guest.hotel": "Hotel",
  "guest.location": "Room / location",
  "guest.description": "Describe the maintenance problem",
  "guest.photo": "Add a photo (optional)",
  "guest.voice": "Use voice input (optional)",
  "guest.email": "Your email for updates (optional)",
  "guest.submit": "Submit request",
  "guest.noPhone":
    "Don't have a smartphone? Please contact the hotel receptionist and they can report the issue for you.",
} as const;

export type TranslationKey = keyof typeof en;

const catalogues: Record<string, Record<string, string>> = { en };

export function t(key: TranslationKey, locale = "en"): string {
  return catalogues[locale]?.[key] ?? catalogues["en"]![key] ?? key;
}
