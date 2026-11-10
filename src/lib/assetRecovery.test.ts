import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { sessionStorage.clear(); vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const message = new Error('Failed to fetch dynamically imported module: https://app.test/assets/Dashboard-old.js');
const settle = async (replace: ReturnType<typeof vi.fn>) => { await vi.waitFor(() => expect(replace).toHaveBeenCalled()); };

describe('Application asset recovery', () => {
  it('recognizes deployment import failures without treating ordinary fetch or render failures as stale assets', async () => {
    const { isAssetLoadError } = await import('./assetRecovery');
    expect(isAssetLoadError(message)).toBe(true);
    expect(isAssetLoadError(new Error('Failed to fetch'))).toBe(false);
    expect(isAssetLoadError(new Error('Cannot read property name'))).toBe(false);
  });
  it('removes only this app’s technical cache and worker, preserves data and reloads the same route with a fresh URL', async () => {
    const replace = vi.fn(); const unregister = vi.fn().mockResolvedValue(true); const other = vi.fn(); const remove = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('location', { href: 'https://app.test/trades?view=list#captures', origin: 'https://app.test', replace });
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ scope: 'https://app.test/', active: { scriptURL: 'https://app.test/sw.js' }, unregister }, { scope: 'https://app.test/other/', active: { scriptURL: 'https://app.test/other/sw.js' }, unregister: other }]) } });
    vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue(['workbox-precache-v2-https://app.test/', 'my-documents', 'workbox-precache-v2-https://other.test/']), delete: remove });
    localStorage.setItem('tr7upfx-local-data', 'saved-data');
    const { recoverAppAssets } = await import('./assetRecovery');
    expect(recoverAppAssets(message)).toBe(true); await settle(replace);
    expect(unregister).toHaveBeenCalledOnce(); expect(other).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledExactlyOnceWith('workbox-precache-v2-https://app.test/');
    const url = new URL(replace.mock.calls[0][0]); expect(url.pathname).toBe('/trades'); expect(url.searchParams.get('view')).toBe('list'); expect(url.hash).toBe('#captures'); expect(url.searchParams.has('_app_refresh')).toBe(true);
    expect(localStorage.getItem('tr7upfx-local-data')).toBe('saved-data'); localStorage.removeItem('tr7upfx-local-data');
  });
  it('does not loop across page reloads and lets a manual retry recover', async () => {
    const replace = vi.fn(); vi.stubGlobal('location', { href: 'https://app.test/', origin: 'https://app.test', replace }); vi.stubGlobal('navigator', { onLine: true });
    sessionStorage.setItem('app-asset-recovery-at', String(Date.now()));
    const { recoverAppAssets } = await import('./assetRecovery');
    expect(recoverAppAssets(message)).toBe(false); expect(replace).not.toHaveBeenCalled();
    expect(recoverAppAssets(message, true)).toBe(true); await settle(replace);
  });
  it('waits for connectivity and still navigates if cache inspection fails', async () => {
    const replace = vi.fn(); vi.stubGlobal('location', { href: 'https://app.test/', origin: 'https://app.test', replace }); vi.stubGlobal('navigator', { onLine: false });
    const { recoverAppAssets } = await import('./assetRecovery'); expect(recoverAppAssets(message)).toBe(false);
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: { getRegistrations: vi.fn().mockRejectedValue(new Error('blocked')) } });
    expect(recoverAppAssets(message)).toBe(true); await settle(replace);
  });
  it('keeps the reload guard when session storage is unavailable', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { href: `https://app.test/?_app_refresh=${Date.now()}`, origin: 'https://app.test', replace });
    vi.stubGlobal('navigator', { onLine: true });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const { recoverAppAssets } = await import('./assetRecovery');
    expect(recoverAppAssets(message)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

});
