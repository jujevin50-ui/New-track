import { useState, useMemo, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { LogoSwitch } from './LogoSwitch';
import { HEADER_BAR, HEADER_GRID } from './navStyles';
import { Account, AccountStatus } from '@/types/account';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2 } from 'lucide-react';

interface AppLayoutProps { children: ReactNode; accounts: Account[]; activeAccountId: string | null; onSelectAccount: (id: string) => void; }
const STATUS_DOT: Record<string, string> = { active: 'bg-profit', pending: 'bg-primary', terminated: 'bg-destructive', paid_out: 'bg-[hsl(38_92%_50%)]' };
type StatusFilter = 'all' | AccountStatus;
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'terminated', label: 'Terminated' }, { key: 'paid_out', label: 'Paid Out' },
];

export function AppLayout({ children, accounts, activeAccountId, onSelectAccount }: AppLayoutProps) {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeAccount = accounts.find(a => a.id === activeAccountId);
  const filteredAccounts = useMemo(() => {
    let list = [...accounts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(a => a.name.toLowerCase().includes(q) || a.broker.toLowerCase().includes(q));
  }, [accounts, search, statusFilter]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const handleSelect = (id: string) => { onSelectAccount(id); setSearch(''); setDropdownOpen(false); };

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Barre du haut : logo | menu centré | colonne vide symétrique → le menu ne peut plus chevaucher les filtres */}
      <header className={HEADER_BAR}>
        <div className={HEADER_GRID}>
          <LogoSwitch className="pointer-events-auto shrink-0" />
          <div className="flex justify-center min-w-0"><TopNav /></div>
          <div aria-hidden />
        </div>
      </header>

      {/* Filtres de comptes : descendus sous le menu, alignés à droite */}
      {accounts.length > 0 && (
        <div className="relative z-40 px-4 md:px-6 pt-1 max-w-[1800px] w-full mx-auto flex justify-end">
          <div className="flex items-center gap-1.5 h-12 px-2 rounded-full bg-card border border-border shadow-[var(--shadow-card)]">
            <div className="hidden md:flex items-center gap-1">
              {FILTERS.filter(f => f.key === 'all' || accounts.some(a => a.status === f.key)).map(f => (
                <button key={f.key} onClick={() => { setStatusFilter(f.key); setDropdownOpen(true); }}
                  className={`h-8 px-3 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${statusFilter === f.key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                  {f.key !== 'all' && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[f.key]}`} />}{f.label}
                </button>
              ))}
            </div>
            <div className="relative" ref={wrapperRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }} onFocus={() => setDropdownOpen(true)}
                  placeholder={activeAccount ? activeAccount.name : 'All accounts'}
                  className="h-9 w-[150px] 2xl:w-[220px] pl-9 text-xs bg-secondary border-transparent rounded-full" />
              </div>
              {dropdownOpen && (
                <div className="absolute top-full mt-2 right-0 w-[300px] max-h-[320px] overflow-auto rounded-2xl border border-border bg-popover shadow-[var(--shadow-pop)] z-50 p-1">
                  <button onClick={() => handleSelect('all')} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-secondary transition-colors ${activeAccountId === 'all' || !activeAccountId ? 'text-primary font-medium' : 'text-foreground'}`}>
                    {(!activeAccountId || activeAccountId === 'all') && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}All accounts
                  </button>
                  {filteredAccounts.map(a => (
                    <button key={a.id} onClick={() => handleSelect(a.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-secondary transition-colors ${a.id === activeAccountId ? 'text-primary font-medium' : 'text-foreground'}`}>
                      {a.id === activeAccountId && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] || 'bg-muted'}`} />
                      <span className="truncate">{a.name}</span>
                      {a.accountCode && <span className="font-mono text-[9px] text-muted-foreground/60 shrink-0">{a.accountCode}</span>}
                      <span className="text-muted-foreground ml-auto text-[10px] shrink-0">{a.broker}</span>
                    </button>
                  ))}
                  {filteredAccounts.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground text-center">No accounts found</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <main key={location.pathname} className="flex-1 overflow-auto px-4 md:px-6 pb-4 md:pb-6 pt-4 animate-page-in">{children}</main>
      </div>
    </div>
  );
}
