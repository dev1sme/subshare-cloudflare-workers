// Registers public/sw.js in production builds only: in dev it would cache Vite's index.html.
// Spec: docs/architecture.md#pwa.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app works the same without it, only without the offline shell.
    });
  });
}
