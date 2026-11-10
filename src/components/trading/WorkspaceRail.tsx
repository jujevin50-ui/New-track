import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Landmark, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';

const query = '(min-width: 1024px)';
const subscribe = (listener: () => void) => { const media = window.matchMedia(query); media.addEventListener('change', listener); return () => media.removeEventListener('change', listener); };
const snapshot = () => window.matchMedia(query).matches;

export default function WorkspaceRail({ children }: { children: ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, snapshot, () => false);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userName } = useUserProfile();
  const finance = pathname === '/finance';
  const content = <div className="rail-inner">
    <div className="rail-brand"><span className="rail-brand-icon"><BarChart3 className="h-5 w-5" /></span><div><p className="text-sm font-semibold tracking-tight">Track Record<span className="text-primary">.</span></p><p className="mt-0.5 text-[10px] text-muted-foreground">Un espace pour progresser</p></div></div>
    <div className="rail-workspaces" role="navigation" aria-label="Modules de l’application">{[{ value: false, label: 'Trading', Icon: BarChart3 }, { value: true, label: 'Finance', Icon: Landmark }].map(({ value, label, Icon }) => <button type="button" key={label} aria-current={finance === value ? 'page' : undefined} onClick={() => { navigate(value ? '/finance' : '/'); setOpen(false); }} className={finance === value ? 'is-active' : ''}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}</div>
    <div className="rail-section-title"><span>{finance ? 'Mes finances' : 'Mon trading'}</span><span className="h-1 w-1 rounded-full bg-primary/60" /></div>
    <div className="rail-navigation" onClick={event => { if (!desktop && event.target instanceof Element && event.target.closest('a, [data-rail-link]')) setOpen(false); }}>{children}</div>
    <div className="rail-profile"><span className="rail-avatar">{(userName || 'M').slice(0, 1).toLocaleUpperCase('fr-FR')}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{userName || 'Mon espace'}</p><p className="mt-1 text-[10px] text-muted-foreground">{finance ? 'Une vue sur ton patrimoine' : 'Le processus avant le résultat'}</p></div></div>
  </div>;

  return <>{desktop ? <aside className="workspace-rail" aria-label="Bandeau latéral">{content}</aside> : <>
    <header className="rail-mobile-header"><Button ref={trigger} variant="ghost" size="icon" aria-label="Ouvrir la navigation" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button><span className="text-sm font-semibold">{finance ? 'Finance' : 'Trading'}</span><span className="ml-auto text-[10px] font-medium text-muted-foreground">Track Record<span className="text-primary">.</span></span></header>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} side="left" className="workspace-rail-mobile p-0"><SheetTitle className="sr-only">Navigation de l’application</SheetTitle><SheetDescription className="sr-only">Choisir un espace et une rubrique.</SheetDescription>{content}</SheetContent></Sheet>
  </>}</>;
}
