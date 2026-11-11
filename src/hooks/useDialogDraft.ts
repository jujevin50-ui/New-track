import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { readFormDraft, removeFormDraft, saveFormDraft } from '@/lib/formDrafts';

function sameShape<T extends object>(value: unknown, shape: T): value is T {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(shape).every(([key,example]) => example === undefined || typeof Reflect.get(value as object,key) === typeof example));
}

/** Recovers a dialog in this browser tab; exported financial records are untouched. */
export function useDialogDraft<T extends object>(key: string, open: boolean, value: T, restore: Dispatch<SetStateAction<T>>) {
  const [ready,setReady] = useState(false);
  const [status,setStatus] = useState<'saved'|'memory'|null>(null);
  const current = useRef(value);
  const completed = useRef(false);
  useEffect(()=>{current.current=value;},[value]);
  useEffect(()=>{
    setReady(false);
    if (!open) return;
    completed.current=false;
    const draft = readFormDraft(key,(candidate): candidate is T=>sameShape(candidate,current.current));
    if (draft) restore(draft);
    setStatus(null); setReady(true);
  },[key,open,restore]);
  useEffect(()=>{
    if (!open || !ready || completed.current) return;
    setStatus(saveFormDraft(key,value));
  },[key,open,ready,value]);
  const clear = () => { completed.current=true; removeFormDraft(key); setStatus(null); };
  return { status,clear };
}
