const DB_NAME = 'tr7upfx-fs';
const STORE = 'handles';
const HANDLE_KEY = 'main';

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await getDB();
    return await new Promise(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearHandle(): Promise<void> {
  const db = await getDB();
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export type PermissionState = 'granted' | 'prompt' | 'denied';

export async function queryPermission(handle: FileSystemFileHandle): Promise<PermissionState> {
  try {
    return await handle.queryPermission({ mode: 'readwrite' }) as PermissionState;
  } catch { return 'denied'; }
}

export async function requestPermission(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    const state = await handle.requestPermission({ mode: 'readwrite' });
    return state === 'granted';
  } catch { return false; }
}

export interface AppData {
  version: number;
  accounts: any[];
  trades: any[];
  pendingOrders: any[];
  dailyJournals: any[];
  dailyAnalyses: any[];
  backtestTrades: any[];
  tradingJournals: any[];
  payouts: any[];
  weeklyReports: any[];
  monthlyReports: any[];
  analysisSyntheses: any[];
  riskRules: any[];
  riskIncreaseRules: any[];
  checklistTemplate: any[];
}

export const DEFAULT_DATA: AppData = {
  version: 1,
  accounts: [],
  trades: [],
  pendingOrders: [],
  dailyJournals: [],
  dailyAnalyses: [],
  backtestTrades: [],
  tradingJournals: [],
  payouts: [],
  weeklyReports: [],
  monthlyReports: [],
  analysisSyntheses: [],
  riskRules: [],
  riskIncreaseRules: [],
  checklistTemplate: [],
};

export async function readFileData(handle: FileSystemFileHandle): Promise<AppData> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return { ...DEFAULT_DATA };
  try {
    return { ...DEFAULT_DATA, ...JSON.parse(text) };
  } catch { return { ...DEFAULT_DATA }; }
}

export async function writeFileData(handle: FileSystemFileHandle, data: AppData): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export async function pickNewFile(): Promise<FileSystemFileHandle> {
  return await (window as any).showSaveFilePicker({
    suggestedName: 'tr7upfx-data.json',
    types: [{ description: 'TR7UPFX Data', accept: { 'application/json': ['.json'] } }],
  });
}

export async function openExistingFile(): Promise<FileSystemFileHandle> {
  const [handle] = await (window as any).showOpenFilePicker({
    types: [{ description: 'TR7UPFX Data', accept: { 'application/json': ['.json'] } }],
    multiple: false,
  });
  return handle;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Fallback for cross-origin iframes (e.g. embedding the site in Notion), where
 * the File System Access pickers are blocked. We read the file with a classic
 * <input type="file"> and persist changes to localStorage — the original file
 * on disk is never written to, so it can't be damaged.
 * ────────────────────────────────────────────────────────────────────────── */

const LS_KEY = 'tr7upfx-local-data';

/** True when the File System Access pickers exist in this context. */
export function hasFsAccess(): boolean {
  return typeof (window as any).showOpenFilePicker === 'function'
    && typeof (window as any).showSaveFilePicker === 'function';
}

/** True for the errors thrown when a picker is blocked in a cross-origin frame. */
export function isPickerBlocked(e: any): boolean {
  return e?.name === 'SecurityError' || e?.name === 'NotAllowedError';
}

export function readLocalData(): AppData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch { return null; }
}

export function writeLocalData(data: AppData): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* quota / disabled */ }
}

export function clearLocalData(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

/** Read an existing JSON file via <input> — works inside cross-origin iframes. */
export function openExistingFileFallback(): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    let settled = false;
    const cleanup = () => { input.remove(); };
    const fail = (name: string, msg: string) => {
      if (settled) return;
      settled = true; cleanup();
      reject(Object.assign(new Error(msg), { name }));
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { fail('AbortError', 'Aucun fichier'); return; }
      try {
        const text = await file.text();
        const data = !text.trim() ? { ...DEFAULT_DATA } : { ...DEFAULT_DATA, ...JSON.parse(text) };
        settled = true; cleanup(); resolve(data);
      } catch { fail('SyntaxError', 'Fichier illisible'); }
    };
    input.oncancel = () => fail('AbortError', 'Annulé');
    document.body.appendChild(input);
    input.click();
  });
}
