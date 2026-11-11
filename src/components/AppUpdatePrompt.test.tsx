import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppUpdatePrompt from './AppUpdatePrompt';

let original:PropertyDescriptor|undefined;
beforeEach(()=>{original=Object.getOwnPropertyDescriptor(navigator,'serviceWorker');vi.useFakeTimers();});
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();if(original)Object.defineProperty(navigator,'serviceWorker',original);else Reflect.deleteProperty(navigator,'serviceWorker');});
function setup(controlled=true,waiting=false) {
  const worker=Object.assign(new EventTarget(),{state:'installing',postMessage:vi.fn()});
  const registration=Object.assign(new EventTarget(),{installing:worker,waiting:waiting?worker:null,update:vi.fn().mockResolvedValue(undefined)});
  const serviceWorker=Object.assign(new EventTarget(),{controller:controlled?{}:null,ready:Promise.resolve(registration)});
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:serviceWorker});
  return {worker,registration,serviceWorker};
}
describe('update proposal',()=>{
  it('does not propose a reload for the first installation',async()=>{
    const {worker,serviceWorker}=setup(false);render(<AppUpdatePrompt/>);await act(async()=>{});
    act(()=>{worker.state='installed';worker.dispatchEvent(new Event('statechange'));serviceWorker.dispatchEvent(new Event('controllerchange'));});
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
  it('offers the installed update again on return after choosing later',async()=>{
    const {worker}=setup();render(<AppUpdatePrompt/>);await act(async()=>{});
    act(()=>{worker.state='installed';worker.dispatchEvent(new Event('statechange'));});
    expect(screen.getByRole('button',{name:'Actualiser'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'Plus tard'}));expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    await act(async()=>{window.dispatchEvent(new Event('focus'));});
    expect(screen.getByRole('complementary',{name:'Mise à jour de l’application'})).toBeInTheDocument();
  });
  it('activates a waiting worker only when the user accepts and blocks duplicate clicks',async()=>{
    const {worker}=setup(true,true);render(<AppUpdatePrompt/>);await act(async()=>{});
    fireEvent.click(screen.getByRole('button',{name:'Actualiser'}));
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({type:'SKIP_WAITING'});
    expect(screen.getByRole('button',{name:'Actualisation…'})).toBeDisabled();
  });
  it('also offers a reload when a new controller already activated in the background',async()=>{
    const {serviceWorker}=setup();render(<AppUpdatePrompt/>);await act(async()=>{});
    act(()=>serviceWorker.dispatchEvent(new Event('controllerchange')));
    expect(screen.getByRole('button',{name:'Actualiser'})).toBeInTheDocument();
  });
});
