import { useState, useMemo } from 'react';
import { Account, AccountFormData, AccountStatus } from '@/types/account';
import { Trade, getNetResult } from '@/types/trade';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, CheckCircle2, Clock, XCircle, FolderOpen, TrendingUp, TrendingDown, Banknote } from 'lucide-react';

interface AccountsPageProps {
  accounts: Account[];
  activeAccountId: string | null;
  onSelectAccount: (id: string) => void;
  onAdd: (data: AccountFormData) => void;
  onUpdate: (id: string, data: AccountFormData) => void;
  onDelete: (id: string) => void;
  categories: string[];
  allTrades: Trade[];
}

const PRESET_CATEGORIES = ['Prop Firm', 'Personal', 'Demo'];
const PRESET_BROKERS = ['FTMO', 'IC Markets', 'Pepperstone', 'XM', 'Exness', 'FundingPips', 'The5ers', 'MyForexFunds', 'TFT', 'Oanda'];

const emptyForm: AccountFormData = {
  accountCode: '',
  name: '',
  broker: '',
  initialBalance: 10000,
  currency: 'USD',
  createdAt: new Date().toISOString().split('T')[0],
  status: 'active',
  category: 'Personal',
  payoutIntervalDays: 0,
  dailyDrawdownPct: 0,
  maxDrawdownPct: 0,
  riskPct: 1,
};

const STATUS_CONFIG: Record<AccountStatus, { label: string; icon: React.ElementType; className: string }> = {
  active:    { label: 'Active',    icon: CheckCircle2, className: 'bg-profit/15 text-profit border-profit/35' },
  terminated:{ label: 'Terminated',icon: XCircle,      className: 'bg-destructive/15 text-destructive border-destructive/20' },
  pending:   { label: 'Pending',   icon: Clock,        className: 'bg-primary/15 text-primary border-primary/20' },
  paid_out:  { label: 'Paid Out',  icon: CheckCircle2, className: 'bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_45%)] border-[hsl(38_92%_50%/0.35)]' },
};

const baseCode = (code: string) => code.replace(/-\d+$/, '') || code;

const Accounts = ({ accounts, activeAccountId, onSelectAccount, onAdd, onUpdate, onDelete, categories, allTrades }: AccountsPageProps) => {
  const { data } = useData();
  const allPayouts = useMemo(() => (data.payouts as any[] || []).map((p: any) => ({
    id: p.id, accountId: p.accountId, amount: Number(p.amount), date: p.date, note: p.note || '',
  })), [data.payouts]);

  const paidAccounts = useMemo(() => accounts.filter(a => a.status === 'paid_out'), [accounts]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormData>(emptyForm);
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'all'>('active');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [customBrokers, setCustomBrokers] = useState<string[]>([]);

  const allBrokers = useMemo(() => {
    const fromAccounts = accounts.map(a => a.broker).filter(Boolean);
    return [...new Set([...PRESET_BROKERS, ...fromAccounts, ...customBrokers])].sort();
  }, [accounts, customBrokers]);

  const allCategories = useMemo(() => [...new Set([...PRESET_CATEGORIES, ...categories])], [categories]);

  const gainByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(a => {
      const trades = allTrades.filter(t => t.accountId === a.id);
      const totalNet = trades.reduce((s, t) => s + getNetResult(t), 0);
      map[a.id] = a.initialBalance > 0 ? (totalNet / a.initialBalance) * 100 : 0;
    });
    return map;
  }, [accounts, allTrades]);

  const openAdd = () => { setEditAccount(null); setForm({ ...emptyForm, createdAt: new Date().toISOString().split('T')[0] }); setDialogOpen(true); };
  const openEdit = (account: Account) => {
    setEditAccount(account);
    setForm({ accountCode: account.accountCode || '', name: account.name, broker: account.broker, initialBalance: account.initialBalance, currency: account.currency, createdAt: account.createdAt, status: account.status || 'active', category: account.category || '', payoutIntervalDays: account.payoutIntervalDays || 0, dailyDrawdownPct: account.dailyDrawdownPct || 0, maxDrawdownPct: account.maxDrawdownPct || 0, riskPct: account.riskPct ?? 1 });
    setDialogOpen(true);
  };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (editAccount) onUpdate(editAccount.id, form); else onAdd(form); setDialogOpen(false); };

  const filtered = useMemo(() => {
    let list = accounts;
    if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(a => (a.category || 'Uncategorized') === filterCategory);
    return list;
  }, [accounts, filterStatus, filterCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    filtered.forEach(a => { const cat = a.category || 'Uncategorized'; if (!groups[cat]) groups[cat] = []; groups[cat].push(a); });
    return groups;
  }, [filtered]);

  const statusCounts = useMemo(() => ({
    all: accounts.length,
    active: accounts.filter(a => a.status === 'active').length,
    terminated: accounts.filter(a => a.status === 'terminated').length,
    pending: accounts.filter(a => a.status === 'pending').length,
    paid_out: accounts.filter(a => a.status === 'paid_out').length,
  }), [accounts]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Accounts</h1>
          <p className="text-xs text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" />New Account</Button>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="h-9">
          <TabsTrigger value="accounts" className="text-xs">Accounts</TabsTrigger>
          <TabsTrigger value="paid" className="text-xs gap-1.5">
            <Banknote className="h-3.5 w-3.5" />
            Paid Accounts
            {paidAccounts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_45%)]">
                {paidAccounts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4 mt-4">

      <div className="flex flex-wrap gap-2 items-center">
        {(['all', 'active', 'pending', 'terminated', 'paid_out'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-primary/15 text-primary border border-primary/40' : 'bg-secondary/50 text-muted-foreground border border-border hover:text-foreground'}`}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s].label} ({statusCounts[s]})
          </button>
        ))}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-secondary border-border"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center"><p className="text-muted-foreground">No accounts. Click "New Account" to create your first account.</p></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catAccounts]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2"><FolderOpen className="h-3.5 w-3.5 text-muted-foreground" /><h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</h2><span className="text-[10px] text-muted-foreground">({catAccounts.length})</span></div>
              <div className="grid gap-3">
                {catAccounts.map((account, ai) => {
                  const statusConf = STATUS_CONFIG[account.status || 'active'];
                  const StatusIcon = statusConf.icon;
                  const gainPct = gainByAccount[account.id] || 0;
                  const isPositive = gainPct >= 0;
                  return (
                    <div key={account.id} className={`bg-card border rounded-lg p-4 flex items-center justify-between cursor-pointer transition-colors animate-fade-in-up ${account.id === activeAccountId ? 'border-primary/50 glow-primary' : 'border-border hover:border-border/80'} ${account.status === 'terminated' ? 'opacity-60' : ''}`} style={{ animationDelay: `${ai * 50}ms` }} onClick={() => onSelectAccount(account.id)}>
                      <div className="flex items-center gap-3">
                        {account.id === activeAccountId && (<CheckCircle2 className="h-4 w-4 text-primary shrink-0" />)}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{account.name}</p>
                            {account.accountCode && <span className="font-mono text-[10px] text-muted-foreground/70 bg-secondary px-1.5 py-0.5 rounded">{account.accountCode}</span>}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${statusConf.className}`}><StatusIcon className="h-2.5 w-2.5" />{statusConf.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {account.broker} · {account.currency} · Created {account.createdAt}
                            {account.riskPct > 0 && ` · Risk: ${account.riskPct}%`}
                            {account.dailyDrawdownPct > 0 && ` · Daily DD: ${account.dailyDrawdownPct}%`}
                            {account.maxDrawdownPct > 0 && ` · Max DD: ${account.maxDrawdownPct}%`}
                            {account.payoutIntervalDays > 0 && ` · Payout: ${account.payoutIntervalDays}d`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-1 font-mono text-sm font-bold ${isPositive ? 'text-profit' : 'text-destructive'}`}>
                          {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {isPositive ? '+' : ''}{gainPct.toFixed(2)}%
                        </div>
                        <p className="font-mono text-sm font-bold text-primary">{account.currency === 'EUR' ? '€' : '$'}{account.initialBalance.toLocaleString()}</p>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(account); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(account.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

        </TabsContent>

        {/* ═══ PAID ACCOUNTS TAB ═══ */}
        <TabsContent value="paid" className="mt-4">
          {paidAccounts.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Banknote className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Aucun compte paid out pour l'instant.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paidAccounts.map(acc => {
                const accPayouts = allPayouts.filter(p => p.accountId === acc.id);
                const totalPaid = accPayouts.reduce((s, p) => s + p.amount, 0);
                const curr = acc.currency === 'EUR' ? '€' : '$';
                const successor = accounts.find(a =>
                  a.accountCode && acc.accountCode &&
                  baseCode(a.accountCode) === baseCode(acc.accountCode) &&
                  a.id !== acc.id && a.status !== 'paid_out'
                );
                const gainPct = gainByAccount[acc.id] || 0;
                return (
                  <div key={acc.id} className="bg-card border rounded-xl p-5 space-y-4"
                    style={{ borderColor: 'hsl(38 92% 50% / 0.3)', backgroundColor: 'hsl(38 92% 50% / 0.03)' }}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Banknote className="h-5 w-5 shrink-0" style={{ color: 'hsl(38 92% 45%)' }} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{acc.name}</span>
                            {acc.accountCode && (
                              <span className="font-mono text-[10px] text-muted-foreground/70 bg-secondary px-1.5 py-0.5 rounded">
                                {acc.accountCode}
                              </span>
                            )}
                            {successor && (
                              <>
                                <span className="text-muted-foreground/40 text-xs">→</span>
                                <span className="font-mono text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                                  {successor.accountCode || successor.name}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {acc.broker} · {curr}{acc.initialBalance.toLocaleString()} · Created {acc.createdAt}
                          </p>
                        </div>
                      </div>
                      <div className={`font-mono text-sm font-bold ${gainPct >= 0 ? 'text-profit' : 'text-destructive'}`}>
                        {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                      </div>
                    </div>

                    {/* Payout rows */}
                    <div className="border-t border-border/40 pt-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        Payout{accPayouts.length > 1 ? 's' : ''}
                      </p>
                      {accPayouts.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50">—</p>
                      ) : (
                        accPayouts.map(p => (
                          <div key={p.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-muted-foreground">{p.date}</span>
                              {p.note && <span className="text-[11px] text-muted-foreground/60 italic">{p.note}</span>}
                            </div>
                            <span className="font-mono text-base font-black text-blue-400">
                              +{curr}{p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))
                      )}
                      {accPayouts.length > 1 && (
                        <div className="flex items-center justify-between border-t border-border/30 pt-2 mt-1">
                          <span className="text-xs font-semibold text-muted-foreground">Total payouts</span>
                          <span className="font-mono text-lg font-black text-blue-400">
                            +{curr}{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle>{editAccount ? 'Edit Account' : 'New Account'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Account Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. FTMO 100K" required className="bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Account ID / Code</Label><Input value={form.accountCode} onChange={e => setForm(f => ({ ...f, accountCode: e.target.value }))} placeholder="e.g. 7UP-001" className="font-mono bg-secondary border-border" /></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <div className="flex gap-2 mt-1.5">
                {PRESET_CATEGORIES.map(c => (<button key={c} type="button" onClick={() => setForm(f => ({ ...f, category: c }))} className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.category === c ? 'bg-primary/15 text-primary border-primary/40' : 'bg-secondary border-border text-muted-foreground'}`}>{c}</button>))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Broker</Label>
              <Input value={form.broker} onChange={e => setForm(f => ({ ...f, broker: e.target.value }))} onBlur={() => { if (form.broker && !allBrokers.includes(form.broker)) setCustomBrokers(prev => [...prev, form.broker]); }} placeholder="Type or select" list="broker-list" required className="bg-secondary border-border" />
              <datalist id="broker-list">{allBrokers.map(b => <option key={b} value={b} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Initial Balance</Label><Input type="number" value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: parseFloat(e.target.value) || 0 }))} required className="font-mono bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Currency</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="USD" required className="bg-secondary border-border" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs text-muted-foreground">Payout Interval (days)</Label><Input type="number" value={form.payoutIntervalDays} onChange={e => setForm(f => ({ ...f, payoutIntervalDays: parseInt(e.target.value) || 0 }))} className="font-mono bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Daily DD %</Label><Input type="number" step="0.1" value={form.dailyDrawdownPct} onChange={e => setForm(f => ({ ...f, dailyDrawdownPct: parseFloat(e.target.value) || 0 }))} className="font-mono bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Max DD %</Label><Input type="number" step="0.1" value={form.maxDrawdownPct} onChange={e => setForm(f => ({ ...f, maxDrawdownPct: parseFloat(e.target.value) || 0 }))} className="font-mono bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Risk %</Label><Input type="number" step="0.01" min="0" max="100" value={form.riskPct} onChange={e => setForm(f => ({ ...f, riskPct: parseFloat(e.target.value) || 0 }))} className="font-mono bg-secondary border-border" /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Creation Date</Label><Input type="date" value={form.createdAt} onChange={e => setForm(f => ({ ...f, createdAt: e.target.value }))} required className="bg-secondary border-border" /></div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="flex gap-2 mt-1.5">
                {(['active', 'pending', 'terminated', 'paid_out'] as AccountStatus[]).map(s => {
                  const conf = STATUS_CONFIG[s];
                  return (<button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.status === s ? conf.className : 'bg-secondary border-border text-muted-foreground'}`}><conf.icon className="h-3 w-3" />{conf.label}</button>);
                })}
              </div>
            </div>
            <Button type="submit" className="w-full">{editAccount ? 'Save' : 'Create Account'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>This action is irreversible. All trades associated with this account will also be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Accounts;
