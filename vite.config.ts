// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Ensure the browser-visible Supabase config is always present at build time.
// The generated client reads import.meta.env.VITE_SUPABASE_*; on the published
// build only the server-side SUPABASE_* names may be set, which produced
// "Missing Supabase environment variable(s)" at runtime.
for (const [viteKey, serverKey] of [
  ["VITE_SUPABASE_URL", "SUPABASE_URL"],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"],
  ["VITE_SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_ID"],
] as const) {
  if (!process.env[viteKey] && process.env[serverKey]) {
    process.env[viteKey] = process.env[serverKey];
  }
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
