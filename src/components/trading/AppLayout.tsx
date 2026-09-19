import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Account, AccountStatus } from '@/types/account';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  accounts: Account[];
  activeAccountId: string | null;
  onSelectAccount: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  active:     '',
  terminated: '(terminated)',
  pending:    '(pending)',
  paid_out:   '(paid out)',
};

const STATUS_DOT: Record<string, string> = {
  active:     'bg-profit',
  pending:    'bg-primary',
  terminated: 'bg-destructive',
  paid_out:   'bg-[hsl(38_92%_50%)]',
};

type StatusFilter = 'all' | AccountStatus;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',        label: 'All'        },
  { key: 'active',     label: 'Active'     },
  { key: 'pending',    label: 'Pending'    },
  { key: 'terminated', label: 'Terminated' },
  { key: 'paid_out',   label: 'Paid Out'   },
];

export function AppLayout({ children, accounts, activeAccountId, onSelectAccount }: AppLayoutProps) {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find(a => a.id === activeAccountId);

  const filteredAccounts = useMemo(() => {
    let list = [...accounts].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(a => a.name.toLowerCase().includes(q) || a.broker.toLowerCase().includes(q));
  }, [accounts, search, statusFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: string) => {
    onSelectAccount(id);
    setSearch('');
    setDropdownOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNav />

      {accounts.length > 0 && (
        <div
          className="
            fixed top-4 right-4 z-40
            flex items-center gap-1.5
            px-1.5 py-1.5 rounded-full
            bg-card/95 backdrop-blur-sm
            border border-border/60
            shadow-[0_8px_24px_rgba(0,0,0,0.15)]
          "
        >
          {/* Status filter pills */}
          <div className="hidden md:flex items-center gap-1">
            {FILTERS.filter(f => f.key === 'all' || accounts.some(a => a.status === f.key)).map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setDropdownOpen(true); }}
                className={`h-6 px-2 text-[10px] font-medium rounded-full transition-colors flex items-center gap-1 ${
                  statusFilter === f.key
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border/50'
                }`}
              >
                {f.key !== 'all' && (
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[f.key]}`} />
                )}
                {f.label}
              </button>
            ))}
          </div>

          {/* Search / selector */}
          <div className="relative" ref={wrapperRef}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                placeholder={activeAccount ? activeAccount.name : 'All accounts'}
                className="h-9 w-[160px] md:w-[220px] pl-8 text-xs bg-background/60 border-border/60 rounded-full"
              />
            </div>
            {dropdownOpen && (
              <div className="absolute top-full mt-2 right-0 w-[300px] max-h-[320px] overflow-auto rounded-lg border border-border bg-popover shadow-lg z-50">
                {/* Always show All accounts at top */}
                <button
                  onClick={() => handleSelect('all')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent/50 transition-colors border-b border-border/40 ${
                    activeAccountId === 'all' || !activeAccountId ? 'text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  {(!activeAccountId || activeAccountId === 'all') && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}
                  All accounts
                </button>
                {filteredAccounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(a.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent/50 transition-colors ${
                      a.id === activeAccountId ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {a.id === activeAccountId && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] || 'bg-muted'}`} />
                    <span className="truncate">{a.name}</span>
                    {a.accountCode && (
                      <span className="font-mono text-[9px] text-muted-foreground/60 shrink-0">{a.accountCode}</span>
                    )}
                    <span className="text-muted-foreground ml-auto text-[10px] shrink-0">{a.broker}</span>
                  </button>
                ))}
                {filteredAccounts.length === 0 && (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">No accounts found</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <main key={location.pathname} className="flex-1 overflow-auto p-4 md:p-6 pt-24 animate-page-in">
          {children}
        </main>
      </div>
    </div>
  );
}
