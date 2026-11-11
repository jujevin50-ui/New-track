import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** The worker may activate in the background; reload the open document only on request. */
export default function AppUpdatePrompt() {
  const [available,setAvailable] = useState(false);
  const [refreshing,setRefreshing] = useState(false);
  const pending = useRef(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  useEffect(()=>{
    if (!('serviceWorker' in navigator)) return;
    let disposed=false;
    let controlled=Boolean(navigator.serviceWorker.controller);
    let checking=false;
    const cleanups:(()=>void)[]=[];
    const announce=()=>{if (!disposed) {pending.current=true;setAvailable(true);}};
    const watch=(worker:ServiceWorker|null)=>{
      if (!worker) return;
      const changed=()=>{if (worker.state==='installed' && controlled) announce();};
      worker.addEventListener('statechange',changed);
      cleanups.push(()=>worker.removeEventListener('statechange',changed));
      changed();
    };
    const controllerChanged=()=>{
      if (controlled) announce();
      controlled=true;
    };
    const check=async()=>{
      if (disposed || document.hidden || !navigator.onLine || checking) return;
      if (pending.current || registration.current?.waiting) announce();
      if (!registration.current) return;
      checking=true;
      try {await registration.current.update();} catch { /* Retry on the next focus or connection. */ }
      finally {checking=false;}
    };
    navigator.serviceWorker.addEventListener('controllerchange',controllerChanged);
    navigator.serviceWorker.ready.then(current=>{
      if (disposed) return;
      registration.current=current;
      const found=()=>watch(current.installing);
      current.addEventListener('updatefound',found);
      cleanups.push(()=>current.removeEventListener('updatefound',found));
      watch(current.installing);
      if (current.waiting && controlled) announce();
      void check();
    }).catch(()=>{ /* Browsers without a usable registration continue normally. */ });
    const interval=window.setInterval(()=>void check(),60_000);
    const focus=()=>void check();
    window.addEventListener('focus',focus);
    window.addEventListener('online',focus);
    document.addEventListener('visibilitychange',focus);
    return ()=>{
      disposed=true;window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange',controllerChanged);
      window.removeEventListener('focus',focus);window.removeEventListener('online',focus);
      document.removeEventListener('visibilitychange',focus);
      cleanups.forEach(cleanup=>cleanup());
    };
  },[]);

  const refresh=()=>{
    if (refreshing) return;
    setRefreshing(true);
    const waiting=registration.current?.waiting;
    if (!waiting) {window.location.reload();return;}
    const reload=()=>window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange',reload,{once:true});
    waiting.postMessage({type:'SKIP_WAITING'});
    // Auto-activation can win the race between reading waiting and sending the message.
    window.setTimeout(reload,3000);
  };
  if (!available) return null;
  return <aside className="app-update-prompt" aria-label="Mise à jour de l’application">
    <div role="status"><p className="text-sm font-semibold">Une mise à jour est disponible</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Actualise l’application pour profiter des dernières améliorations.</p></div>
    <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" disabled={refreshing} onClick={()=>setAvailable(false)}>Plus tard</Button><Button loading={refreshing} onClick={refresh}>{!refreshing&&<RefreshCw className="h-4 w-4" aria-hidden="true" />}{refreshing?'Actualisation…':'Actualiser'}</Button></div>
  </aside>;
}
