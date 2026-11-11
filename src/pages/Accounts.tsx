import DashboardFilter from '@/components/trading/DashboardFilter';
import { localDay } from '@/lib/discipline';
import { useState, useMemo } from 'react';
import { Account, AccountFormData, AccountStatus } from '@/types/account';
import { Trade, getNetResult } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface AccountsPageProps {
  accounts: Account[];
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
  createdAt: localDay(),
  status: 'active',
  category: 'Personal',
  payoutIntervalDays: 0,
  dailyDrawdownPct: 0,
  maxDrawdownPct: 0,
  riskPct: 1,
};

const STATUS_CONFIG: Record<AccountStatus, { label: string; icon: React.ElementType; className: string }> = {
  active:    { label: 'Actif',    icon: CheckCircle2, className: 'bg-profit/15 text-profit border-profit/35' },
  terminated:{ label: 'Terminé',icon: XCircle,      className: 'bg-destructive/15 text-destructive border-destructive/20' },
  pending:   { label: 'En attente',   icon: Clock,        className: 'bg-primary/15 text-primary border-primary/20' },
  paid_out:  { label: 'Cycle clôturé',  icon: CheckCircle2, className: 'bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_45%)] border-[hsl(38_92%_50%/0.35)]' },
};

const Accounts = ({ accounts, onAdd, onUpdate, onDelete, categories, allTrades }: AccountsPageProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormData>(emptyForm);
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
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
      const trades = allTrades.filter(t => t.accountId === a.id && t.endDate && t.endDate.slice(0,10) <= localDay());
      const totalNet = trades.reduce((s, t) => s + getNetResult(t), 0);
      map[a.id] = a.initialBalance > 0 ? (totalNet / a.initialBalance) * 100 : 0;
    });
    return map;
  }, [accounts, allTrades]);

  const openAdd = () => { setSaveError(''); setEditAccount(null); setForm({ ...emptyForm, createdAt: localDay() }); setDialogOpen(true); };
  const openEdit = (account: Account) => {
    setSaveError('');
    setEditAccount(account);
    setForm({ accountCode: account.accountCode || '', name: account.name, broker: account.broker, initialBalance: account.initialBalance, currency: account.currency, createdAt: account.createdAt, status: account.status || 'active', category: account.category || '', payoutIntervalDays: account.payoutIntervalDays || 0, dailyDrawdownPct: account.dailyDrawdownPct || 0, maxDrawdownPct: account.maxDrawdownPct || 0, riskPct: account.riskPct ?? 1 });
    setDialogOpen(true);
  };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if(saving) return; setSaving(true); setSaveError(''); try {if(editAccount) await onUpdate(editAccount.id, form); else await onAdd(form); setDialogOpen(false);} catch {setSaveError('Impossible d’enregistrer ce compte.');} finally {setSaving(false);} };

  const filtered = useMemo(() => {
    let list = accounts;
    const search = query.trim().toLocaleLowerCase('fr-FR');
    if(search) list = list.filter(account=>[account.name,account.accountCode,account.broker].some(text=>text.toLocaleLowerCase('fr-FR').includes(search)));
    if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(a => (a.category || 'Uncategorized') === filterCategory);
    return list;
  }, [accounts, query, filterStatus, filterCategory]);

  const currencyMoney = (value:number,currency:string) => { try {return new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:2}).format(value);} catch{return value.toLocaleString('fr-FR');} };

  return (
    <div className="accounts-page w-full space-y-8 pb-10">
      <h1 className="sr-only page-title-hidden">Comptes</h1>
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="dashboard-filter-controls">

        <DashboardFilter label="Statut" ariaLabel="Statut des comptes" value={filterStatus} onChange={value=>setFilterStatus(value as AccountStatus | 'all')} options={[{value:'all',label:'Tous les statuts'},...Object.entries(STATUS_CONFIG).map(([value,item])=>({value,label:item.label}))]}/>
        <DashboardFilter label="Famille" ariaLabel="Famille des comptes" value={filterCategory} onChange={setFilterCategory} options={[{value:'all',label:'Toutes les familles'},...allCategories.map(category=>({value:category,label:category}))]}/>
      </div><Button onClick={openAdd} className="h-[42px] gap-2 rounded-[10px] text-xs"><Plus className="h-4 w-4"/>Nouveau compte</Button></div>
      <div className="flex flex-wrap items-center justify-between gap-4"><Input aria-label="Rechercher un compte" placeholder="Nom, code ou courtier…" value={query} onChange={event=>setQuery(event.target.value)} className="h-10 w-full rounded-[10px] bg-transparent text-xs sm:w-72"/></div>
      {<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="text-muted-foreground"><tr>{['Compte','Statut','Capital initial','Performance nette','Risque / trade','Actions'].map(label=><th key={label} className="px-3 pb-5 font-normal">{label}</th>)}</tr></thead><tbody>{filtered.map(account=><tr key={account.id} className="transition-colors hover:bg-secondary/30"><td className="px-3 py-5"><button className="text-left text-sm font-medium hover:underline" onClick={()=>openEdit(account)} aria-label={`Modifier ${account.name}`}>{account.name}</button><p className="mt-1 text-[10px] text-muted-foreground">{[account.accountCode,account.broker,account.category].filter(Boolean).join(' · ')}</p></td><td className="px-3 py-5"><span className={`rounded-md px-2 py-1 text-[10px] ${STATUS_CONFIG[account.status].className}`}>{STATUS_CONFIG[account.status].label}</span></td><td className="whitespace-nowrap px-3 py-5 tabular-nums">{currencyMoney(account.initialBalance,account.currency)}</td><td className={`whitespace-nowrap px-3 py-5 font-medium tabular-nums ${gainByAccount[account.id]<0 ? 'text-loss' : 'text-profit'}`}>{account.initialBalance>0 ? `${gainByAccount[account.id]>0 ? '+' : ''}${gainByAccount[account.id].toLocaleString('fr-FR',{maximumFractionDigits:2})} %` : '—'}</td><td className="px-3 py-5 tabular-nums">{account.riskPct} %</td><td className="px-3 py-5"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label={`Modifier les paramètres de ${account.name}`} onClick={()=>openEdit(account)}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label={`Supprimer ${account.name}`} onClick={()=>setDeleteId(account.id)}><Trash2 className="h-4 w-4 text-muted-foreground"/></Button></div></td></tr>)}</tbody></table>{!filtered.length && <p className="py-16 text-center text-sm text-muted-foreground">Aucun compte dans cette sélection.</p>}</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="account-editor w-[calc(100vw-32px)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto bg-background border-border">
          <DialogHeader><DialogTitle>{editAccount ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground" htmlFor="account-name">Nom du compte</Label><Input disabled={saving} id="account-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex. FTMO 100K" required className="bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground" htmlFor="account-code">Code du compte</Label><Input disabled={saving} id="account-code" value={form.accountCode} onChange={e => setForm(f => ({ ...f, accountCode: e.target.value }))} placeholder="Ex. 7UP-001" className="font-mono bg-secondary border-border" /></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Famille</Label>
              <div className="flex gap-2 mt-1.5">
                {PRESET_CATEGORIES.map(c => (<button disabled={saving} key={c} type="button" onClick={() => setForm(f => ({ ...f, category: c }))} className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.category === c ? 'bg-primary/15 text-primary border-primary/40' : 'bg-secondary border-border text-muted-foreground'}`}>{c}</button>))}
              </div>
            </div>
            <div>
              <Label htmlFor="account-broker" className="text-xs text-muted-foreground">Courtier</Label>
              <Input disabled={saving} id="account-broker" value={form.broker} onChange={e => setForm(f => ({ ...f, broker: e.target.value }))} onBlur={() => { if (form.broker && !allBrokers.includes(form.broker)) setCustomBrokers(prev => [...prev, form.broker]); }} placeholder="Saisir un courtier" list="broker-list" required className="bg-secondary border-border" />
              <datalist id="broker-list">{allBrokers.map(b => <option key={b} value={b} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground" htmlFor="account-capital">Capital initial</Label><Input disabled={saving} id="account-capital" type="number" min="0" step="0.01" value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: parseFloat(e.target.value) || 0 }))} required className="font-mono bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground" htmlFor="account-currency">Devise</Label><Input disabled={saving} id="account-currency" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase().trim() }))} placeholder="USD" required className="bg-secondary border-border" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">

              <div><Label className="text-xs text-muted-foreground">Repli quotidien (%)</Label><Input disabled={saving} type="number" step="0.1" value={form.dailyDrawdownPct} onChange={e => setForm(f => ({ ...f, dailyDrawdownPct: parseFloat(e.target.value) || 0 }))} className="font-mono bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Repli maximal (%)</Label><Input disabled={saving} type="number" step="0.1" value={form.maxDrawdownPct} onChange={e => setForm(f => ({ ...f, maxDrawdownPct: parseFloat(e.target.value) || 0 }))} className="font-mono bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Risque (%)</Label><Input disabled={saving} type="number" step="0.01" min="0" max="100" value={form.riskPct} onChange={e => setForm(f => ({ ...f, riskPct: parseFloat(e.target.value) || 0 }))} className="font-mono bg-secondary border-border" /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground" htmlFor="account-created">Date de création</Label><Input disabled={saving} id="account-created" type="date" value={form.createdAt} onChange={e => setForm(f => ({ ...f, createdAt: e.target.value }))} required className="bg-secondary border-border" /></div>
            <div>
              <Label className="text-xs text-muted-foreground">Statut</Label>
              <div className="flex gap-2 mt-1.5">
                {(['active', 'pending', 'terminated', 'paid_out'] as AccountStatus[]).map(s => {
                  const conf = STATUS_CONFIG[s];
                  return (<button disabled={saving} key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.status === s ? conf.className : 'bg-secondary border-border text-muted-foreground'}`}><conf.icon className="h-3 w-3" />{conf.label}</button>);
                })}
              </div>
            </div>
            {saveError && <p role="alert" className="text-sm text-loss">{saveError}</p>}
            <Button disabled={saving} type="submit" className="w-full">{saving ? 'Enregistrement…' : editAccount ? 'Enregistrer' : 'Créer le compte'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>Ce compte sera retiré de la liste. Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Accounts;
