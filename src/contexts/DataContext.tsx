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
  // Apply queued file changes to the last successfully written snapshot.
  const dataRef = useRef<AppData>(DEFAULT_DATA);
  const fileQueue = useRef(Promise.resolve());

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

  const persist = useCallback(async (change: (current: AppData) => AppData) => {
    const handle = handleRef.current;
    const commit = (next: AppData) => {
      dataRef.current = next;
      setData(next);
    };

    if (!handle) {
      const next = change(dataRef.current);
      if (fallbackRef.current) writeLocalData(next);
      commit(next);
      return;
    }

    const write = fileQueue.current.then(async () => {
      if (handleRef.current !== handle) throw new Error('Le fichier de données a changé.');
      const next = change(dataRef.current);
      await writeFileData(handle, next);
      commit(next);
    });
    fileQueue.current = write.catch(() => {});
    await write;
  }, []);

  const saveData = useCallback((next: AppData) => persist(() => next), [persist]);

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
    const close = fileQueue.current.then(async () => {
      await clearHandle();
      clearLocalData();
      handleRef.current = null;
      fallbackRef.current = false;
      dataRef.current = DEFAULT_DATA;
      setData(DEFAULT_DATA);
      setStatus('disconnected');
    });
    fileQueue.current = close.catch(() => {});
    await close;
  }, []);

  const saveTable = useCallback((table: TableKey, rows: any[]) =>
    persist(current => ({ ...current, [table]: rows })), [persist]);

  const addRow = useCallback((table: TableKey, row: any) =>
    persist(current => ({ ...current, [table]: [...current[table], row] })), [persist]);

  const updateRow = useCallback((table: TableKey, id: string, updates: any) =>
    persist(current => ({ ...current, [table]: current[table].map(row => row.id === id ? { ...row, ...updates } : row) })), [persist]);

  const deleteRow = useCallback((table: TableKey, id: string) =>
    persist(current => ({ ...current, [table]: current[table].filter(row => row.id !== id) })), [persist]);

  const upsertRow = useCallback((table: TableKey, row: any, keyField = 'date') => persist(current => {
    const rows = current[table] as any[];
    const idx = rows.findIndex(r => r[keyField] === row[keyField]);
    const newRows = idx >= 0 ? rows.map((r, i) => i === idx ? row : r) : [...rows, row];
    return { ...current, [table]: newRows };
  }), [persist]);

  return (
    <DataContext.Provider value={{ data, status, connectNew, connectExisting, reconnect, disconnect, saveData, saveTable, addRow, updateRow, deleteRow, upsertRow }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
