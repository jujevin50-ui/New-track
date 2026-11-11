import { useCallback, useRef, useState, type SetStateAction } from 'react';

const prefix='track-record:page:v1:';
const memory=new Map<string,unknown>();
export const oneOf=<T extends string>(...values:T[])=>(value:unknown):value is T=>typeof value==='string'&&values.includes(value as T);

function sameShape(value:unknown,example:unknown):boolean {
  if (example===null) return value===null;
  if (typeof example==='number') return typeof value==='number'&&Number.isFinite(value);
  if (typeof example!=='object') return typeof value===typeof example;
  if (Array.isArray(example)) return Array.isArray(value);
  return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(example).every(([key,item])=>sameShape(Reflect.get(value,key),item)));
}
function restore<T>(key:string,fallback:T,validate?: (value:unknown)=>boolean):T {
  const decode=(candidate:unknown):T=>{
    let value=candidate;
    if (fallback instanceof Date) {
      if (!(value instanceof Date)&&typeof value!=='string') return fallback;
      const date=value instanceof Date?value:new Date(value);if(!Number.isFinite(date.getTime()))return fallback;value=date;
    }
    return (validate?validate(value):fallback instanceof Date?value instanceof Date:sameShape(value,fallback))?value as T:fallback;
  };
  if (memory.has(key)) return decode(memory.get(key));
  try {const raw=localStorage.getItem(prefix+key);return raw===null?fallback:decode(JSON.parse(raw));}
  catch {return fallback;}
}

/** Persist view/filter choices only. Forms, financial records and shared account scope stay separate. */
export function usePagePreference<T>(key:string,initial:T|(()=>T),validate?:(value:unknown)=>boolean) {
  const [fallback]=useState(initial);
  const [entry,setEntry]=useState(()=>({key,value:restore(key,fallback,validate)}));
  const current=useRef(entry);
  if (entry.key!==key) {
    const next={key,value:restore(key,fallback,validate)};
    current.current=next;setEntry(next);
  } else current.current=entry;
  const setValue=useCallback((action:SetStateAction<T>)=>{
    const value=typeof action==='function'?(action as (value:T)=>T)(current.current.value):action;
    current.current={key,value};setEntry(current.current);
    try {localStorage.setItem(prefix+key,JSON.stringify(value));memory.delete(key);}
    catch {memory.set(key,value);}
  },[key]);
  return [current.current.value,setValue] as const;
}
