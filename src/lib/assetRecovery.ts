const KEY = 'app-asset-recovery-at';
const COOLDOWN = 60_000;
let recovering = false;
let lastAttempt = typeof location === 'undefined' ? 0 : Number(new URL(location.href).searchParams.get('_app_refresh')) || 0;

export function isAssetLoadError(error: unknown): boolean {
  const value = error instanceof Error ? error : { name: '', message: String(error ?? '') };
  return value.name === 'ChunkLoadError' || /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading (?:CSS )?chunk|Unable to preload CSS|Expected a JavaScript.*module.*MIME/i.test(value.message);
}

/** Refresh application assets only; user data in localStorage/IndexedDB is untouched. */
export function recoverAppAssets(error: unknown, manual = false): boolean {
  if (!isAssetLoadError(error) || navigator.onLine === false || recovering) return false;
  let previous = lastAttempt;
  try { previous = Math.max(previous, Number(sessionStorage.getItem(KEY)) || 0); } catch { /* Storage may be disabled. */ }
  if (!manual && Date.now() - previous < COOLDOWN) return false;
  recovering = true;
  lastAttempt = Date.now();
  try { sessionStorage.setItem(KEY, String(lastAttempt)); } catch { /* Keep the in-memory guard. */ }
  void (async () => {
    const cleanup = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(registrations.filter(registration => new URL(registration.scope).origin === location.origin && [registration.active, registration.waiting, registration.installing].some(worker => worker && new URL(worker.scriptURL).pathname === '/sw.js')).map(registration => registration.unregister()));
      }
      if ('caches' in globalThis) {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(name => name.startsWith('workbox-precache-') && name.includes(location.origin)).map(name => caches.delete(name)));
      }
    };
    try {
      // A stalled worker must not leave the page waiting indefinitely.
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([cleanup(), new Promise(resolve => { timer = setTimeout(resolve, 2500); })]); }
      finally { clearTimeout(timer); }
    } catch { /* A fresh navigation still bypasses the stale HTML response. */ }
    const url = new URL(location.href);
    url.searchParams.set('_app_refresh', String(lastAttempt));
    location.replace(url.href);
  })();
  return true;
}
