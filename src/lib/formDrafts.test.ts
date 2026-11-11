import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFormDraft, removeFormDraft, saveFormDraft } from './formDrafts';
const valid=(value:unknown):value is {notes:string}=>Boolean(value&&typeof value==='object'&&typeof Reflect.get(value,'notes')==='string');
afterEach(()=>{vi.restoreAllMocks();sessionStorage.clear();});
describe('dialog recovery failure paths',()=>{
  it('keeps the draft in memory when the browser storage quota is exceeded',()=>{
    const key='quota';vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError');});
    expect(saveFormDraft(key,{notes:'Ne pas perdre cette saisie'})).toBe('memory');
    expect(readFormDraft(key,valid)?.notes).toBe('Ne pas perdre cette saisie');removeFormDraft(key);
  });
  it('keeps the newest edits when an older draft was persisted before storage filled up',()=>{
    saveFormDraft('latest',{notes:'Ancienne version'});
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError');});
    saveFormDraft('latest',{notes:'Dernière version'});
    expect(readFormDraft('latest',valid)?.notes).toBe('Dernière version');removeFormDraft('latest');
  });
  it('ignores malformed persisted JSON without breaking the dialog',()=>{
    sessionStorage.setItem('track-record-ui-draft:broken','{broken');
    expect(readFormDraft('broken',valid)).toBeNull();
  });
  it('removes the recovered draft after a successful save',()=>{
    saveFormDraft('saved',{notes:'Un seul enregistrement'});removeFormDraft('saved');
    expect(readFormDraft('saved',valid)).toBeNull();
  });
});
