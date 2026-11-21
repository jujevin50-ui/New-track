import type { FinanceAssetProfile } from './financeAssets';
import type { StrategyDocument } from './strategyDocuments';
import type { Objective } from './objectives';
import type { FundamentalWeek } from './fundamentalContext';

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
  notes: import('@/types/note').Note[];
  strategyDocuments: StrategyDocument[];
  objectives: Objective[];
  fundamentalWeeks: FundamentalWeek[];
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
  yearlyReports: any[];
  analysisSyntheses: any[];
  riskRules: any[];
  riskIncreaseRules: any[];
  checklistTemplate: any[];
  financeAccounts: any[];
  financeTransactions: any[];
  financeSubscriptions: any[];
  financeTransfers: any[];
  financeStatements: any[];
  financeAssets: FinanceAssetProfile[];
  habits: any[];
  habitCompletions: any[];
  taskLists: any[];
  tasks: any[];
}

export const DEFAULT_DATA: AppData = {
  version: 1,
  notes: [],
  strategyDocuments: [],
  objectives: [],
  fundamentalWeeks: [],
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
  yearlyReports: [],
  analysisSyntheses: [],
  riskRules: [],
  riskIncreaseRules: [],
  checklistTemplate: [],
  financeAccounts: [],
  financeTransactions: [],
  financeSubscriptions: [],
  financeTransfers: [],
  financeStatements: [],
  financeAssets: [],
  habits: [],
  habitCompletions: [],
  taskLists: [],
  tasks: [],
};

/** Garantit que chaque table est bien un tableau (évite les crashs si le fichier contient null / un type inattendu). */
export function normalizeData(raw: any): AppData {
  const merged: any = { ...DEFAULT_DATA, ...(raw && typeof raw === 'object' ? raw : {}) };
  for (const key of Object.keys(DEFAULT_DATA) as (keyof AppData)[]) {
    if (Array.isArray((DEFAULT_DATA as any)[key]) && !Array.isArray(merged[key])) merged[key] = [];
  }
  return merged as AppData;
}

export async function readFileData(handle: FileSystemFileHandle): Promise<AppData> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return { ...DEFAULT_DATA };
  try {
    return normalizeData(JSON.parse(text));
  } catch { return { ...DEFAULT_DATA }; }
}

// Data updates replace changed rows and tables, so unchanged attachments can reuse their encoded bytes.
const encodedTables = new WeakMap<unknown[], Blob>();
const encodedLargeRows = new WeakMap<object, Blob>();

function encodeTable(rows: unknown[]): Blob {
  const cached = encodedTables.get(rows);
  if (cached) return cached;

  const parts: BlobPart[] = ['['];
  let smallRows = '';
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const object = row !== null && typeof row === 'object' ? row : null;
    let encoded: string | Blob | undefined = object ? encodedLargeRows.get(object) : undefined;
    if (!encoded) {
      encoded = JSON.stringify(row) ?? 'null';
      if (object && encoded.length >= 64 * 1024) {
        encoded = new Blob([encoded]);
        encodedLargeRows.set(object, encoded);
      }
    }
    if (index > 0) smallRows += ',';
    if (typeof encoded === 'string') {
      smallRows += encoded;
    } else {
      parts.push(smallRows, encoded);
      smallRows = '';
    }
  }
  parts.push(smallRows, ']');
  const table = new Blob(parts);
  encodedTables.set(rows, table);
  return table;
}

export async function writeFileData(handle: FileSystemFileHandle, data: AppData): Promise<void> {
  const parts: BlobPart[] = ['{\n'];
  let first = true;
  for (const [key, value] of Object.entries(data)) {
    const encoded = Array.isArray(value) ? encodeTable(value) : JSON.stringify(value);
    if (encoded === undefined) continue;
    if (!first) parts.push(',\n');
    parts.push(JSON.stringify(key), ': ', encoded);
    first = false;
  }
  parts.push('\n}\n');
  const snapshot = new Blob(parts, { type: 'application/json' });

  const writable = await handle.createWritable();
  try {
    await writable.write(snapshot);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
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

const LS_KEY = 'tr7upfx-local-data';

export function hasFsAccess(): boolean {
  return typeof (window as any).showOpenFilePicker === 'function'
    && typeof (window as any).showSaveFilePicker === 'function';
}

export function isPickerBlocked(e: any): boolean {
  return e?.name === 'SecurityError' || e?.name === 'NotAllowedError';
}

export function readLocalData(): AppData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return normalizeData(JSON.parse(raw));
  } catch { return null; }
}

export function writeLocalData(data: AppData): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
  catch { throw new Error('Stockage local plein ou indisponible. Libérez de l’espace ou utilisez un fichier de données.'); }
}

export function clearLocalData(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

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
        const data = !text.trim() ? { ...DEFAULT_DATA } : normalizeData(JSON.parse(text));
        settled = true; cleanup(); resolve(data);
      } catch { fail('SyntaxError', 'Fichier illisible'); }
    };
    input.oncancel = () => fail('AbortError', 'Annulé');
    document.body.appendChild(input);
    input.click();
  });
}
