import { base } from "../infra/platform/registry";

export async function retireDevelopmentRegistration() {
  if (!("serviceWorker" in navigator)) return;
  const scope = new URL(base, location.origin).href;
  const script = new URL(base + "sw.js", location.origin).href;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const own = registrations.filter(
    (registration) =>
      registration.scope === scope &&
      [registration.active, registration.waiting, registration.installing].some(
        (worker) => worker?.scriptURL === script,
      ),
  );
  if (!own.length) return;
  window.dispatchEvent(new Event("phy:prepare-update"));
  const controlled = navigator.serviceWorker.controller?.scriptURL === script;
  await Promise.all(own.map((registration) => registration.unregister()));
  if (controlled) location.reload();
}
