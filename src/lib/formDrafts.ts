/** UI-only recovery. Never adds fields to the exported trading/finance data file. */
const memory = new Map<string, unknown>();
const prefix = 'track-record-ui-draft:';
export function readFormDraft<T>(key: string, validate: (value: unknown) => value is T): T | null {
  // A failed later write must never replace the latest in-memory draft with an older stored copy.
  if (memory.has(key)) { const cached=memory.get(key); return validate(cached) ? cached : null; }
  try {
    const raw = sessionStorage.getItem(prefix + key);
    if (raw) { const value: unknown = JSON.parse(raw); if (validate(value)) { memory.set(key,value); return value; } }
  } catch { /* Memory still recovers a draft if storage is unavailable. */ }
  const value = memory.get(key);
  return validate(value) ? value : null;
}
export function saveFormDraft(key: string, value: unknown): 'saved' | 'memory' {
  memory.set(key,value);
  try { sessionStorage.setItem(prefix+key,JSON.stringify(value)); return 'saved'; }
  catch { return 'memory'; }
}
export function removeFormDraft(key: string) {
  memory.delete(key);
  try { sessionStorage.removeItem(prefix+key); } catch { memory.set(key,null); }
}
