import { APP_LOGO } from '@/lib/branding';
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChartNoAxesCombined, Landmark, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

let pendingWorkspace: { from: boolean; to: boolean } | null = null;
const workspaces = [
  { finance: false, label: 'Trading', Icon: ChartNoAxesCombined },
  { finance: true, label: 'Finance', Icon: Landmark },
];

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
    if (!pill || !pending) return;
    pendingWorkspace = null;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (pending.to !== finance || media.matches) return;
    pill.closest('.workspace-rail')?.setAttribute('data-workspace-switch', '');
    const from = pending.from ? 100 : 0, to = finance ? 100 : 0;
    const animation = pill.animate([
      { transform: `translateX(${from}%)` },
      { transform: `translateX(${to}%)` },
    ], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
    const stop = () => { if (media.matches) animation.cancel(); };
    media.addEventListener('change', stop);
    return () => { animation.cancel(); media.removeEventListener('change', stop); };
  }, [finance, desktop, open]);
  const content = <div className="rail-inner">
    <div className="rail-brand rail-brand-logo"><img src={APP_LOGO} alt="Track Record" className="h-16 w-16 object-contain" /></div>
    <div className="rail-workspaces" role="navigation" aria-label="Modules de l’application">
      <span ref={workspacePill} className="rail-workspace-pill" aria-hidden="true" style={{transform:`translateX(${finance ? 100 : 0}%)`}} />
      {workspaces.map(({ finance: destination, label, Icon }) => (
        <button type="button" key={label} aria-current={finance === destination ? 'page' : undefined} onClick={() => {
          if (desktop && destination !== finance) pendingWorkspace = { from: finance, to: destination };
          navigate(destination ? '/finance' : '/');
          setOpen(false);
        }}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
    <div className="rail-navigation" onClick={event => { if (!desktop && event.target instanceof Element && event.target.closest('a, [data-rail-link]')) setOpen(false); }}>{children}</div>
  </div>;

  return <>{desktop ? <aside className="workspace-rail" aria-label="Bandeau latéral">{content}</aside> : <>
    <header className="rail-mobile-header"><Button ref={trigger} variant="ghost" size="icon" aria-label="Ouvrir la navigation" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button><img src={APP_LOGO} alt="Track Record" className="absolute left-1/2 h-9 w-9 -translate-x-1/2 object-contain" /></header>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} side="left" className="workspace-rail-mobile p-0"><SheetTitle className="sr-only">Navigation de l’application</SheetTitle><SheetDescription className="sr-only">Choisir un espace et une rubrique.</SheetDescription>{content}</SheetContent></Sheet>
  </>}</>;
}
