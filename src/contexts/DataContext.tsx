import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AppData, DEFAULT_DATA,
  getStoredHandle, storeHandle, clearHandle,
  queryPermission, requestPermission,
  readFileData, writeFileData,
  pickNewFile, openExistingFile,
  hasFsAccess, isPickerBlocked,
  readLocalData, writeLocalData, clearLocalData, openExistingFileFallback,
} from '@/lib/fileStorage';

export type FileStatus = 'loading' | 'disconnected' | 'needs-reconnect' | 'connected';

type TableKey = keyof Omit<AppData, 'version'>;

interface DataContextValue {
  data: AppData;
  status: FileStatus;
  connectNew: () => Promise<void>;
  connectExisting: () => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  saveData: (newData: AppData) => Promise<void>;
  saveTable: (table: TableKey, rows: any[]) => Promise<void>;
  addRow: (table: TableKey, row: any) => Promise<void>;
  updateRow: (table: TableKey, id: string, updates: any) => Promise<void>;
  deleteRow: (table: TableKey, id: string) => Promise<void>;
  upsertRow: (table: TableKey, row: any, keyField?: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [status, setStatus] = useState<FileStatus>('loading');
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  // Local fallback mode (cross-origin iframe e.g. Notion): persist to localStorage
  const fallbackRef = useRef(false);
  // Always-current data ref so sequential mutations don't clobber each other
  const dataRef = useRef<AppData>(DEFAULT_DATA);

  useEffect(() => {
    (async () => {
      const handle = await getStoredHandle();
      if (handle) {
        const perm = await queryPermission(handle);
        if (perm === 'granted') {
          handleRef.current = handle;
          const d = await readFileData(handle);
          dataRef.current = d;
          setData(d);
          setStatus('connected');
        } else {
          handleRef.current = handle;
          setStatus('needs-reconnect');
        }
        return;
      }
      // No file handle — restore the local fallback session if there is one
      const local = readLocalData();
      if (local) {
        fallbackRef.current = true;
        dataRef.current = local;
        setData(local);
        setStatus('connected');
        return;
      }
      setStatus('disconnected');
    })();
  }, []);

  const persist = useCallback(async (newData: AppData) => {
    dataRef.current = newData;
    setData(newData);
    if (handleRef.current) await writeFileData(handleRef.current, newData);
    else if (fallbackRef.current) writeLocalData(newData);
  }, []);

  const connectNew = useCallback(async () => {
    if (hasFsAccess()) {
      try {
        const handle = await pickNewFile();
        await writeFileData(handle, DEFAULT_DATA);
        await storeHandle(handle);
        handleRef.current = handle;
        fallbackRef.current = false;
        dataRef.current = DEFAULT_DATA;
        setData(DEFAULT_DATA);
        setStatus('connected');
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;     // user cancelled
        if (!isPickerBlocked(e)) throw e;          // genuine error
        // picker blocked (cross-origin iframe) → fall through to local mode
      }
    }
    // Fallback: local-only storage (e.g. embedded in Notion)
    await clearHandle();
    handleRef.current = null;
    fallbackRef.current = true;
    dataRef.current = DEFAULT_DATA;
    setData(DEFAULT_DATA);
    setStatus('connected');
    writeLocalData(DEFAULT_DATA);
  }, []);

  const connectExisting = useCallback(async () => {
    // Preferred path: File System Access (full read/write to the file on disk)
    if (hasFsAccess()) {
      try {
        const handle = await openExistingFile();
        const ok = await requestPermission(handle);
        if (!ok) throw new Error('Permission refusée');
        const d = await readFileData(handle);
        await storeHandle(handle);
        handleRef.current = handle;
        fallbackRef.current = false;
        dataRef.current = d;
        setData(d);
        setStatus('connected');
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;     // user cancelled
        if (!isPickerBlocked(e)) throw e;          // genuine error
        // picker blocked (cross-origin iframe) → fall through to <input> fallback
      }
    }
    // Fallback: read the file via <input> (works inside Notion's iframe).
    // The original file is only read, never written to.
    const d = await openExistingFileFallback();
    await clearHandle();
    handleRef.current = null;
    fallbackRef.current = true;
    dataRef.current = d;
    setData(d);
    setStatus('connected');
    writeLocalData(d);
  }, []);

  const reconnect = useCallback(async () => {
    if (!handleRef.current) { setStatus('disconnected'); return; }
    const ok = await requestPermission(handleRef.current);
    if (ok) {
      const d = await readFileData(handleRef.current);
      dataRef.current = d;
      setData(d);
      setStatus('connected');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await clearHandle();
    clearLocalData();
    handleRef.current = null;
    fallbackRef.current = false;
    dataRef.current = DEFAULT_DATA;
    setData(DEFAULT_DATA);
    setStatus('disconnected');
  }, []);

  // All mutations read from dataRef.current so sequential calls see each other's writes
  const saveTable = useCallback(async (table: TableKey, rows: any[]) => {
    await persist({ ...dataRef.current, [table]: rows });
  }, [persist]);

  const addRow = useCallback(async (table: TableKey, row: any) => {
    const cur = dataRef.current;
    await persist({ ...cur, [table]: [...(cur[table] as any[]), row] });
  }, [persist]);

  const updateRow = useCallback(async (table: TableKey, id: string, updates: any) => {
    const cur = dataRef.current;
    await persist({ ...cur, [table]: (cur[table] as any[]).map(r => r.id === id ? { ...r, ...updates } : r) });
  }, [persist]);

  const deleteRow = useCallback(async (table: TableKey, id: string) => {
    const cur = dataRef.current;
    await persist({ ...cur, [table]: (cur[table] as any[]).filter(r => r.id !== id) });
  }, [persist]);

  const upsertRow = useCallback(async (table: TableKey, row: any, keyField = 'date') => {
    const cur = dataRef.current;
    const rows = cur[table] as any[];
    const idx = rows.findIndex(r => r[keyField] === row[keyField]);
    const newRows = idx >= 0 ? rows.map((r, i) => i === idx ? row : r) : [...rows, row];
    await persist({ ...cur, [table]: newRows });
  }, [persist]);

  return (
    <DataContext.Provider value={{ data, status, connectNew, connectExisting, reconnect, disconnect, saveData: persist, saveTable, addRow, updateRow, deleteRow, upsertRow }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
