// After a new deploy, previously loaded pages reference old hashed chunk URLs
// that no longer exist. Reload once (guarded by sessionStorage) to pick up the
// fresh build instead of showing a blank screen.
const FLAG = "maintainx:chunk-reload";

function isStaleChunkError(value: unknown): boolean {
  const message = value instanceof Error ? value.message : String(value ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export function reloadOnce() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(FLAG)) return;
  sessionStorage.setItem(FLAG, "1");
  window.location.reload();
}

export function installStaleChunkRecovery(): () => void {
  if (typeof window === "undefined") return () => {};
  // Successful navigation means the current build is fine — clear the guard.
  sessionStorage.removeItem(FLAG);

  const onPreloadError = (event: Event) => {
    event.preventDefault();
    reloadOnce();
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    if (isStaleChunkError(event.reason)) reloadOnce();
  };
  const onError = (event: ErrorEvent) => {
    if (isStaleChunkError(event.error ?? event.message)) reloadOnce();
  };

  window.addEventListener("vite:preloadError", onPreloadError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("error", onError);

  return () => {
    window.removeEventListener("vite:preloadError", onPreloadError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("error", onError);
  };
}

export { isStaleChunkError };
