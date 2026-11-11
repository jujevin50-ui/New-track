import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { oneOf, usePagePreference } from './usePagePreference';
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.clear();});
describe('page browsing preferences',()=>{
  it('restores filters after unmount while keeping pages independent',()=>{
    const first=renderHook(()=>usePagePreference('test.filters',{result:'all',from:''}));
    act(()=>first.result.current[1]({result:'win',from:'2026-01-01'}));first.unmount();
    const second=renderHook(()=>usePagePreference('test.filters',{result:'all',from:''}));
    const other=renderHook(()=>usePagePreference('test.other',{result:'all',from:''}));
    expect(second.result.current[0]).toEqual({result:'win',from:'2026-01-01'});expect(other.result.current[0].result).toBe('all');
  });
  it('does not lose functional updates batched in the same event',()=>{
    const hook=renderHook(()=>usePagePreference('test.limit',8));
    act(()=>{hook.result.current[1](value=>value+12);hook.result.current[1](value=>value+12);});
    expect(hook.result.current[0]).toBe(32);expect(JSON.parse(localStorage.getItem('track-record:page:v1:test.limit')!)).toBe(32);
  });
  it('recovers Date objects after serialization',()=>{
    const first=renderHook(()=>usePagePreference('test.date',new Date('2026-01-01T12:00:00Z')));
    act(()=>first.result.current[1](new Date('2025-08-01T12:00:00Z')));first.unmount();
    const second=renderHook(()=>usePagePreference('test.date',new Date('2026-01-01T12:00:00Z')));
    expect(second.result.current[0].getFullYear()).toBe(2025);expect(second.result.current[0].getMonth()).toBe(7);
  });
  it('falls back safely for malformed JSON, partial filters and invalid enum values',()=>{
    localStorage.setItem('track-record:page:v1:test.bad','{bad');
    expect(renderHook(()=>usePagePreference('test.bad','all')).result.current[0]).toBe('all');
    localStorage.setItem('track-record:page:v1:test.partial',JSON.stringify({result:'win'}));
    expect(renderHook(()=>usePagePreference('test.partial',{result:'all',from:''})).result.current[0]).toEqual({result:'all',from:''});
    localStorage.setItem('track-record:page:v1:test.enum',JSON.stringify('invalid'));
    expect(renderHook(()=>usePagePreference('test.enum','all',oneOf('all','win'))).result.current[0]).toBe('all');
  });
  it('keeps navigation state in memory if browser storage rejects writes',()=>{
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError');});
    const first=renderHook(()=>usePagePreference('test.denied','all'));act(()=>first.result.current[1]('win'));first.unmount();
    expect(renderHook(()=>usePagePreference('test.denied','all')).result.current[0]).toBe('win');
  });
  it('loads the correct preference when a reusable component changes namespace',()=>{
    localStorage.setItem('track-record:page:v1:test.month',JSON.stringify(20));
    const hook=renderHook(({key})=>usePagePreference(key,8),{initialProps:{key:'test.week'}});
    act(()=>hook.result.current[1](16));hook.rerender({key:'test.month'});expect(hook.result.current[0]).toBe(20);
  });
});
