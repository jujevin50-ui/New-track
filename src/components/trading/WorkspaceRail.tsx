import { APP_LOGO } from '@/lib/branding';
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

let pendingWorkspace: { from: boolean; to: boolean } | null = null;

const query = '(min-width: 1024px)';
const subscribe = (listener: () => void) => { const media = window.matchMedia(query); media.addEventListener('change', listener); return () => media.removeEventListener('change', listener); };
const snapshot = () => window.matchMedia(query).matches;

export default function WorkspaceRail({ children }: { children: ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, snapshot, () => false);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const finance = pathname === '/finance';
  const workspacePill = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const pill = workspacePill.current;
    const pending = pendingWorkspace;
    if (!pill || !pending || pending.to !== finance) return;
    pendingWorkspace = null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = pending.from ? 100 : 0, to = finance ? 100 : 0;
    const animation = pill.animate([
      { transform: `translateX(${from}%) scale(1,1)` },
      { transform: `translateX(${(from+to)/2}%) scale(1.22,.88)`, offset: .42 },
      { transform: `translateX(${to}%) scale(.96,1.04)`, offset: .78 },
      { transform: `translateX(${to}%) scale(1,1)` },
    ], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => { if (media.matches) animation.cancel(); };
    media.addEventListener('change', stop);
    return () => { animation.cancel(); media.removeEventListener('change', stop); };
  }, [finance, desktop, open]);
  const content = <div className="rail-inner">
    <div className="rail-brand rail-brand-logo"><img src={APP_LOGO} alt="Track Record" className="h-16 w-16 object-contain" /></div>
    <div className="rail-workspaces rail-workspaces-animated" role="navigation" aria-label="Modules de l’application">
      <span ref={workspacePill} className="rail-workspace-pill" aria-hidden="true" style={{transform:`translateX(${finance ? 100 : 0}%)`}} />
      {[{ value: false, label: 'Trading' }, { value: true, label: 'Finance' }].map(({ value, label }) => <button type="button" key={label} aria-current={finance === value ? 'page' : undefined} onClick={() => {
        if (value !== finance) pendingWorkspace = { from: finance, to: value };
        navigate(value ? '/finance' : '/'); setOpen(false);
      }} className={finance === value ? 'is-active' : ''}><span>{label}</span></button>)}
    </div>
    <div className="rail-navigation" onClick={event => { if (!desktop && event.target instanceof Element && event.target.closest('a, [data-rail-link]')) setOpen(false); }}>{children}</div>
  </div>;

  return <>{desktop ? <aside className="workspace-rail" aria-label="Bandeau latéral">{content}</aside> : <>
    <header className="rail-mobile-header"><Button ref={trigger} variant="ghost" size="icon" aria-label="Ouvrir la navigation" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button><img src={APP_LOGO} alt="Track Record" className="absolute left-1/2 h-9 w-9 -translate-x-1/2 object-contain" /></header>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} side="left" className="workspace-rail-mobile p-0"><SheetTitle className="sr-only">Navigation de l’application</SheetTitle><SheetDescription className="sr-only">Choisir un espace et une rubrique.</SheetDescription>{content}</SheetContent></Sheet>
  </>}</>;
}
