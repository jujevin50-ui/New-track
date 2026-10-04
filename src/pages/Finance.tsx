import { useMemo, useState } from 'react';
import { LogoSwitch } from '@/components/trading/LogoSwitch';
import { StatementsView, type FinanceStatement } from '@/components/finance/StatementsView';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowDownLeft, ArrowUpRight, Banknote, CalendarClock, ChevronLeft, ChevronRight,
  CreditCard, Landmark, Pencil, Plus, Repeat2, Save, Settings2, ShieldCheck, TrendingDown,
  TrendingUp, Wallet, X, PiggyBank, CircleDollarSign
} from 'lucide-react';
import { YearFlowBars, CashflowChart, FlowAreaChart, Donut, AccountBars, PALETTE } from '@/components/finance/financeCharts';
import { toast } from 'sonner';
import type { ReactNode } from 'react';

interface FinanceAccount { id: string; name: string; type: string; institution: string; balance: number; openingBalance?: number; currency: string; color?: string; archived?: boolean; initialCapital?: number | null; initialDate?: string | null; }
interface FinanceTransaction { id: string; date: string; description: string; amount: number; type: 'income' | 'expense'; accountId: string; category: string; notes?: string; }
interface FinanceSubscription { id: string; name: string; amount: number; frequency: 'monthly' | 'yearly' | 'weekly'; nextDate: string; accountId: string; category: string; active: boolean; }
interface FinanceTransfer { id: string; date: string; fromAccountId: string; toAccountId: string; amount: number; recurring: boolean; frequency?: 'monthly' | 'weekly' | 'yearly'; nextDate?: string; active: boolean; }

type Tab = 'overview' | 'transactions' | 'accounts' | 'subscriptions' | 'transfers';

const ACCOUNT_TYPES = ['Compte courant', 'Épargne', 'Assurance-vie', 'PEA', 'CTO', 'Crypto', 'Espèces', 'Autre'];
const EXPENSE_CATEGORIES = ['Logement', 'Alimentation', 'Transport', 'Abonnements', 'Loisirs', 'Shopping', 'Santé', 'Formation', 'Trading', 'Famille', 'Impôts', 'Autre'];
const INCOME_CATEGORIES = ['Salaire', 'Trading', 'Payout', 'Intérêts', 'Vente', 'Autre'];
const eur = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const dateKey = (d: string) => String(d || '').slice(0, 10);
const monthKey = (d: string) => dateKey(d).slice(0, 7);
// Dates en heure LOCALE (toISOString convertit en UTC et fait reculer d'un mois/jour en France)
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => localDate(new Date());
const monthKeyOf = (d: Date) => localDate(d).slice(0, 7);

const emptyTx: FinanceTransaction = { id: '', date: todayStr(), description: '', amount: 0, type: 'expense', accountId: '', category: 'Autre', notes: '' };

export default function Finance() {
  const { data, addRow, updateRow, deleteRow } = useData();
  const accounts = ((data as any).financeAccounts || []) as FinanceAccount[];
  const transactions = ((data as any).financeTransactions || []) as FinanceTransaction[];
  const subscriptions = ((data as any).financeSubscriptions || []) as FinanceSubscription[];
  const transfers = ((data as any).financeTransfers || []) as FinanceTransfer[];
  const statements = ((data as any).financeStatements || []) as FinanceStatement[];
  const [accountsView, setAccountsView] = useState<'list' | 'statements'>('list');
  const [statementsAccountId, setStatementsAccountId] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('overview');
  const [overviewMode, setOverviewMode] = useState<'month' | 'year'>('month');
  const [cursor, setCursor] = useState(new Date());
  const [txOpen, setTxOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [tx, setTx] = useState<FinanceTransaction>({ ...emptyTx });
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [accountForm, setAccountForm] = useState<FinanceAccount>({ id: '', name: '', type: 'Compte courant', institution: '', balance: 0, currency: 'EUR' });
  const [subForm, setSubForm] = useState<FinanceSubscription>({ id: '', name: '', amount: 0, frequency: 'monthly', nextDate: todayStr(), accountId: '', category: 'Abonnements', active: true });
  const [transferForm, setTransferForm] = useState<FinanceTransfer>({ id: '', date: todayStr(), fromAccountId: '', toAccountId: '', amount: 0, recurring: false, frequency: 'monthly', nextDate: todayStr(), active: true });

  const key = monthKeyOf(cursor);
  const monthLabel = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthTx = useMemo(() => transactions.filter(t => monthKey(t.date) === key), [transactions, key]);
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const accountBalances = useMemo(() => {
    const result: Record<string, number> = {};
    accounts.forEach(a => {
      const txNet = transactions.filter(t => t.accountId === a.id).reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
      const transferNet = transfers.reduce((sum, t) => {
        if (t.fromAccountId === a.id) return sum - Number(t.amount);
        if (t.toAccountId === a.id) return sum + Number(t.amount);
        return sum;
      }, 0);
      // `balance` (or `openingBalance`) is the starting balance.
      // The current balance is then recalculated from every transaction and transfer.
      const opening = a.openingBalance !== undefined ? Number(a.openingBalance) : Number(a.balance || 0);
      result[a.id] = opening + txNet + transferNet;
    });
    return result;
  }, [accounts, transactions, transfers]);
  const balance = accounts.reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const investmentBalance = accounts.filter(a => ['PEA', 'CTO', 'Assurance-vie', 'Crypto'].includes(a.type)).reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0);
  const fixedMonthly = subscriptions.filter(s => s.active).reduce((s, x) => s + (x.frequency === 'monthly' ? x.amount : x.frequency === 'yearly' ? x.amount / 12 : x.amount * 52 / 12), 0);
  const cashBalance = accounts.filter(a => ['Compte courant', 'Épargne', 'Espèces'].includes(a.type)).reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category] || 0) + Number(t.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [monthTx]);

  const trendData = useMemo(() => {
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    let running = 0;
    return Array.from({ length: days }, (_, i) => {
      const date = `${key}-${String(i + 1).padStart(2, '0')}`;
      const day = monthTx.filter(t => dateKey(t.date) === date);
      running += day.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
      return { day: String(i + 1), net: running };
    });
  }, [cursor, key, monthTx]);

  const yearData = useMemo(() => {
    const year = cursor.getFullYear();
    return Array.from({ length: 12 }, (_, month) => {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const txs = transactions.filter(t => monthKey(t.date) === prefix);
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { month: new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), income, expenses, cashflow: income - expenses, savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0 };
    });
  }, [cursor, transactions]);

  const yearTotals = useMemo(() => yearData.reduce((a, m) => ({ income: a.income + m.income, expenses: a.expenses + m.expenses, cashflow: a.cashflow + m.cashflow }), { income: 0, expenses: 0, cashflow: 0 }), [yearData]);
  const yearSavingsRate = yearTotals.income > 0 ? (yearTotals.cashflow / yearTotals.income) * 100 : 0;

  const accountData = accounts.filter(a => !a.archived).map(a => ({ name: a.name, balance: accountBalances[a.id] ?? 0 }));
  const upcomingSubs = subscriptions.filter(s => s.active).sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 6);
  const recurringMonthly = subscriptions.filter(s => s.active).reduce((s, x) => s + (x.frequency === 'monthly' ? x.amount : x.frequency === 'yearly' ? x.amount / 12 : x.amount * 52 / 12), 0);

  const moveMonth = (delta: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  const accountName = (accountId: string) => accounts.find(a => a.id === accountId)?.name || 'Compte supprimé';

  const saveTx = async () => {
    if (!tx.description || !tx.accountId || tx.amount <= 0) return toast.error('Complète la description, le compte et le montant.');
    const row = { ...tx, id: tx.id || id('tx'), amount: Math.abs(Number(tx.amount)) };
    if (tx.id) await updateRow('financeTransactions' as any, tx.id, row); else await addRow('financeTransactions' as any, row);
    setTxOpen(false); setTx({ ...emptyTx, accountId: accounts[0]?.id || '' }); toast.success('Transaction enregistrée');
  };

  const saveAccount = async () => {
    if (!accountForm.name) return toast.error('Donne un nom au compte.');
    const txNet = editingAccount ? transactions.filter(t => t.accountId === editingAccount.id).reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0) : 0;
    const transferNet = editingAccount ? transfers.reduce((sum, t) => sum + (t.toAccountId === editingAccount.id ? Number(t.amount) : t.fromAccountId === editingAccount.id ? -Number(t.amount) : 0), 0) : 0;
    const openingBalance = editingAccount ? Number(accountForm.balance) - txNet - transferNet : Number(accountForm.balance);
    const row = { ...accountForm, id: accountForm.id || id('acc'), balance: Number(accountForm.balance), openingBalance };
    if (editingAccount) await updateRow('financeAccounts' as any, editingAccount.id, row); else await addRow('financeAccounts' as any, row);
    setAccountOpen(false); setEditingAccount(null); toast.success('Compte enregistré');
  };

  const saveSub = async () => {
    if (!subForm.name || !subForm.accountId || subForm.amount <= 0) return toast.error('Complète les informations de l’abonnement.');
    const row = { ...subForm, id: subForm.id || id('sub'), amount: Math.abs(Number(subForm.amount)) };
    if (subForm.id) await updateRow('financeSubscriptions' as any, subForm.id, row); else await addRow('financeSubscriptions' as any, row);
    setSubOpen(false); setSubForm({ ...subForm, id: '', name: '', amount: 0 }); toast.success('Abonnement enregistré');
  };

  const saveTransfer = async () => {
    if (!transferForm.fromAccountId || !transferForm.toAccountId || transferForm.fromAccountId === transferForm.toAccountId || transferForm.amount <= 0) return toast.error('Choisis deux comptes différents et un montant valide.');
    await addRow('financeTransfers' as any, { ...transferForm, id: id('trf'), amount: Math.abs(Number(transferForm.amount)) });
    setTransferOpen(false); toast.success('Virement enregistré');
  };

  const saveStatement = async (statement: FinanceStatement, isEdit: boolean, applyBalance: boolean) => {
    if (isEdit) await updateRow('financeStatements' as any, statement.id, statement); else await addRow('financeStatements' as any, statement);
    if (!applyBalance) return;
    // Applique la valeur au solde du compte seulement si c'est le relevé le plus récent
    const latest = [...statements.filter(x => x.accountId === statement.accountId && x.id !== statement.id), statement].sort((a, b) => a.date.localeCompare(b.date)).pop();
    if (latest?.id !== statement.id) return;
    const acc = accounts.find(a => a.id === statement.accountId);
    if (!acc) return;
    const txNet = transactions.filter(t => t.accountId === acc.id).reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    const transferNet = transfers.reduce((sum, t) => sum + (t.toAccountId === acc.id ? Number(t.amount) : t.fromAccountId === acc.id ? -Number(t.amount) : 0), 0);
    await updateRow('financeAccounts' as any, acc.id, { balance: statement.totalValue, openingBalance: statement.totalValue - txNet - transferNet });
  };

  const deleteStatement = async (statement: FinanceStatement) => { await deleteRow('financeStatements' as any, statement.id); };

  const setInitialCapital = async (accountId: string, capital: number | null, date: string | null) => {
    await updateRow('financeAccounts' as any, accountId, { initialCapital: capital, initialDate: date });
  };

  return (
    <div className="min-h-screen bg-background text-foreground -mx-4 md:-mx-6 -mb-4 md:-mb-6">
      <LogoSwitch floating />
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="max-w-[1500px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-h-[60px] pl-[96px]">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Wallet className="h-5 w-5 text-emerald-400" /></div>
            <div><p className="text-sm font-semibold">My Finance</p><p className="text-[11px] text-muted-foreground">Patrimoine · dépenses · revenus · automatisations</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTab('accounts')}><Landmark className="h-3.5 w-3.5" />{accounts.length} comptes</Button>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={() => { setTx({ ...emptyTx, accountId: accounts[0]?.id || '' }); setTxOpen(true); }}><Plus className="h-3.5 w-3.5" />Transaction</Button>
          </div>
        </div>
        <div className="max-w-[1500px] mx-auto px-5 flex gap-1 overflow-x-auto">
          {([['overview','Vue d’ensemble'],['transactions','Transactions'],['accounts','Comptes'],['subscriptions','Abonnements'],['transfers','Virements']] as [Tab,string][]).map(([value,label]) => (
            <button key={value} onClick={() => setTab(value)} className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === value ? 'text-emerald-400 border-emerald-400' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>{label}</button>
          ))}
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto p-5 space-y-5">
        {tab === 'overview' && <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Vue {overviewMode === 'month' ? 'mensuelle' : 'annuelle'}</p><div className="flex items-center gap-2 mt-1"><button onClick={() => setCursor(new Date(cursor.getFullYear() + (overviewMode === 'year' ? -1 : 0), cursor.getMonth() + (overviewMode === 'month' ? -1 : 0), 1))} className="p-1.5 rounded-lg hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button><h1 className="text-xl font-bold capitalize min-w-[190px] text-center">{overviewMode === 'month' ? monthLabel : cursor.getFullYear()}</h1><button onClick={() => setCursor(new Date(cursor.getFullYear() + (overviewMode === 'year' ? 1 : 0), cursor.getMonth() + (overviewMode === 'month' ? 1 : 0), 1))} className="p-1.5 rounded-lg hover:bg-muted"><ChevronRight className="h-4 w-4" /></button></div></div>
            <div className="flex items-center gap-1 rounded-xl border border-border p-1"><button onClick={() => setOverviewMode('month')} className={`px-3 py-1.5 rounded-lg text-xs ${overviewMode === 'month' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}>Mois</button><button onClick={() => setOverviewMode('year')} className={`px-3 py-1.5 rounded-lg text-xs ${overviewMode === 'year' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}>Année</button></div>
            <div className="flex items-center gap-2"><div className="text-right"><p className="text-[10px] text-muted-foreground">Patrimoine suivi</p><p className="font-mono text-lg font-bold">{eur(balance)}</p></div></div>
          </div>

          {overviewMode === 'year' && <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric title="Revenus annuels" value={eur(yearTotals.income)} icon={<ArrowDownLeft className="h-4 w-4" />} tone="text-emerald-400" />
              <Metric title="Dépenses annuelles" value={eur(yearTotals.expenses)} icon={<ArrowUpRight className="h-4 w-4" />} tone="text-rose-400" />
              <Metric title="Cash-flow annuel" value={eur(yearTotals.cashflow)} icon={<TrendingUp className="h-4 w-4" />} tone={yearTotals.cashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
              <Metric title="Taux d’épargne annuel" value={`${yearSavingsRate.toFixed(1)} %`} icon={<PiggyBank className="h-4 w-4" />} tone="text-violet-400" />
            </div>
            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
              <Card title={`Flux de ${cursor.getFullYear()}`} subtitle="Revenus, dépenses et cash-flow par mois"><div className="h-[320px]"><YearFlowBars data={yearData} /></div></Card>
              <Card title="Cash-flow mensuel" subtitle="Évolution sur l’année"><div className="h-[320px]"><CashflowChart data={yearData} /></div></Card>
            </div>
            <Card title="Détail des 12 mois" subtitle="Vue complète de l’année"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-muted-foreground border-b border-border"><th className="text-left py-3">Mois</th><th className="text-right py-3">Revenus</th><th className="text-right py-3">Dépenses</th><th className="text-right py-3">Cash-flow</th><th className="text-right py-3">Taux d’épargne</th></tr></thead><tbody>{yearData.map(m=><tr key={m.month} className="border-b border-border/40"><td className="py-3 capitalize font-medium">{m.month}</td><td className="text-right py-3 text-emerald-400 font-mono">{eur(m.income)}</td><td className="text-right py-3 text-rose-400 font-mono">{eur(m.expenses)}</td><td className={`text-right py-3 font-mono ${m.cashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{eur(m.cashflow)}</td><td className="text-right py-3 font-mono">{m.savingsRate.toFixed(1)} %</td></tr>)}</tbody></table></div></Card>
          </>}

          {overviewMode === 'month' && <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Metric title="Patrimoine suivi" value={eur(balance)} icon={<CircleDollarSign className="h-4 w-4" />} tone="text-sky-400" />
            <Metric title="Cash-flow" value={eur(income - expenses)} icon={<TrendingUp className="h-4 w-4" />} tone={income - expenses >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
            <Metric title="Taux d’épargne" value={`${savingsRate.toFixed(1)} %`} icon={<PiggyBank className="h-4 w-4" />} tone="text-emerald-400" />
            <Metric title="Liquidités" value={eur(cashBalance)} icon={<Banknote className="h-4 w-4" />} tone="text-cyan-400" />
            <Metric title="Investissements" value={eur(investmentBalance)} icon={<TrendingUp className="h-4 w-4" />} tone="text-violet-400" />
            <Metric title="Dépenses fixes" value={`${eur(fixedMonthly)} / mois`} icon={<CalendarClock className="h-4 w-4" />} tone="text-orange-400" />
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <Metric title="Revenus du mois" value={eur(income)} icon={<ArrowDownLeft className="h-4 w-4" />} tone="text-emerald-400" />
            <Metric title="Dépenses du mois" value={eur(expenses)} icon={<ArrowUpRight className="h-4 w-4" />} tone="text-rose-400" />
            <Metric title="Épargne potentielle" value={eur(Math.max(0, income - expenses))} icon={<PiggyBank className="h-4 w-4" />} tone="text-emerald-400" />
          </div>

          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
            <Card title="Flux du mois" subtitle="Cumul revenus − dépenses">
              <div className="h-[280px]"><FlowAreaChart data={trendData} lastIndex={trendData.length - 1} /></div>
            </Card>
            <Card title="Dépenses par catégorie" subtitle="Répartition du mois">
              {categoryData.length ? <div className="h-[280px] flex items-center"><div className="w-[55%] h-full"><Donut data={categoryData} centerLabel="Dépenses" /></div><div className="flex-1 space-y-2">{categoryData.slice(0,6).map((x,i)=><div key={x.name} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 truncate"><span className="h-2 w-2 rounded-full" style={{background:PALETTE[i%PALETTE.length]}} />{x.name}</span><span className="font-mono">{eur(x.value)}</span></div>)}</div></div> : <Empty text="Aucune dépense ce mois-ci" />}
            </Card>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
            <Card title="Répartition des comptes" subtitle="Solde actuel"><div className="h-[230px]">{accountData.length ? <AccountBars data={accountData} /> : <Empty text="Crée ton premier compte" />}</div></Card>
            <Card title="Abonnements à venir" subtitle={`${eur(recurringMonthly)} / mois environ`}><div className="space-y-2">{upcomingSubs.length ? upcomingSubs.map(s=><div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40"><div className="flex items-center gap-2 min-w-0"><div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center"><Repeat2 className="h-3.5 w-3.5 text-orange-400"/></div><div className="min-w-0"><p className="text-xs font-medium truncate">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.nextDate} · {accountName(s.accountId)}</p></div></div><span className="font-mono text-xs">{eur(s.amount)}</span></div>) : <Empty text="Aucun abonnement" />}</div></Card>
          </div>
          </>}
        </>}

        {tab === 'transactions' && <TransactionsView transactions={transactions} accounts={accounts} onAdd={() => { setTx({ ...emptyTx, accountId: accounts[0]?.id || '' }); setTxOpen(true); }} onEdit={(x)=>{setTx(x);setTxOpen(true)}} onDelete={async (x)=>{await deleteRow('financeTransactions' as any,x.id);toast.success('Transaction supprimée')}} />}
        {tab === 'accounts' && (
          <div className="flex items-center gap-1 rounded-xl border border-border p-1 w-fit">
            <button onClick={() => setAccountsView('list')} className={`px-3 py-1.5 rounded-lg text-xs ${accountsView === 'list' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Mes comptes</button>
            <button onClick={() => { setStatementsAccountId(undefined); setAccountsView('statements'); }} className={`px-3 py-1.5 rounded-lg text-xs ${accountsView === 'statements' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Relevés & évolution</button>
          </div>
        )}
        {tab === 'accounts' && accountsView === 'list' && <AccountsView onStatements={(a)=>{setStatementsAccountId(a.id);setAccountsView('statements')}} accounts={accounts.map(a=>({...a,balance:accountBalances[a.id] ?? Number(a.balance || 0)}))} onNew={() => {setEditingAccount(null);setAccountForm({id:'',name:'',type:'Compte courant',institution:'',balance:0,currency:'EUR'});setAccountOpen(true)}} onEdit={(a)=>{const original=accounts.find(x=>x.id===a.id)||a;setEditingAccount(original);setAccountForm(a);setAccountOpen(true)}} onDelete={async a=>{await deleteRow('financeAccounts' as any,a.id);toast.success('Compte supprimé')}} />}
        {tab === 'accounts' && accountsView === 'statements' && <StatementsView key={statementsAccountId || 'all'} accounts={accounts} statements={statements} initialAccountId={statementsAccountId} onSave={saveStatement} onDelete={deleteStatement} onSetInitial={setInitialCapital} />}
        {tab === 'subscriptions' && <SubscriptionsView subscriptions={subscriptions} accounts={accounts} onNew={()=>{setSubForm({...subForm,id:'',name:'',amount:0,accountId:accounts[0]?.id||''});setSubOpen(true)}} onToggle={async s=>await updateRow('financeSubscriptions' as any,s.id,{active:!s.active})} onDelete={async s=>{await deleteRow('financeSubscriptions' as any,s.id);toast.success('Abonnement supprimé')}} />}
        {tab === 'transfers' && <TransfersView transfers={transfers} accounts={accounts} onNew={()=>{setTransferForm({...transferForm,id:'',fromAccountId:accounts[0]?.id||'',toAccountId:accounts[1]?.id||''});setTransferOpen(true)}} onDelete={async t=>{await deleteRow('financeTransfers' as any,t.id);toast.success('Virement supprimé')}} />}
      </main>

      <Dialog open={txOpen} onOpenChange={setTxOpen}><DialogContent className="bg-card border-border sm:max-w-lg"><DialogHeader><DialogTitle>Nouvelle transaction</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-2"><button onClick={()=>setTx(x=>({...x,type:'expense',category:'Autre'}))} className={`p-3 rounded-xl border text-xs ${tx.type==='expense'?'border-rose-500/50 bg-rose-500/10 text-rose-300':'border-border'}`}>Dépense</button><button onClick={()=>setTx(x=>({...x,type:'income',category:'Autre'}))} className={`p-3 rounded-xl border text-xs ${tx.type==='income'?'border-emerald-500/50 bg-emerald-500/10 text-emerald-300':'border-border'}`}>Revenu</button></div><div className="grid grid-cols-2 gap-3"><div><Label>Date</Label><Input type="date" value={tx.date} onChange={e=>setTx(x=>({...x,date:e.target.value}))}/></div><div><Label>Montant</Label><Input type="number" step="0.01" value={tx.amount||''} onChange={e=>setTx(x=>({...x,amount:Number(e.target.value)}))}/></div></div><div><Label>Description</Label><Input value={tx.description} onChange={e=>setTx(x=>({...x,description:e.target.value}))} placeholder="Courses, salaire, abonnement…"/></div><div className="grid grid-cols-2 gap-3"><div><Label>Compte</Label><Select value={tx.accountId} onValueChange={v=>setTx(x=>({...x,accountId:v}))}><SelectTrigger><SelectValue placeholder="Compte"/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Catégorie</Label><Select value={tx.category} onValueChange={v=>setTx(x=>({...x,category:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{(tx.type==='expense'?EXPENSE_CATEGORIES:INCOME_CATEGORIES).map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Note</Label><Input value={tx.notes||''} onChange={e=>setTx(x=>({...x,notes:e.target.value}))}/></div><Button onClick={saveTx} className="w-full bg-emerald-600 hover:bg-emerald-500"><Save className="h-4 w-4 mr-2"/>Enregistrer</Button></div></DialogContent></Dialog>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}><DialogContent className="bg-card border-border sm:max-w-lg"><DialogHeader><DialogTitle>{editingAccount?'Modifier le compte':'Nouveau compte'}</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label>Nom</Label><Input value={accountForm.name} onChange={e=>setAccountForm(x=>({...x,name:e.target.value}))} placeholder="Compte courant"/></div><div><Label>Banque / établissement</Label><Input value={accountForm.institution} onChange={e=>setAccountForm(x=>({...x,institution:e.target.value}))} placeholder="Boursobank, Fortuneo…"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><Select value={accountForm.type} onValueChange={v=>setAccountForm(x=>({...x,type:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ACCOUNT_TYPES.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Solde actuel</Label><Input type="number" step="0.01" value={accountForm.balance||''} onChange={e=>setAccountForm(x=>({...x,balance:Number(e.target.value)}))}/></div></div><div><Label>Devise</Label><Input value={accountForm.currency} onChange={e=>setAccountForm(x=>({...x,currency:e.target.value.toUpperCase()}))}/></div><Button onClick={saveAccount} className="w-full bg-emerald-600 hover:bg-emerald-500">Enregistrer</Button></div></DialogContent></Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}><DialogContent className="bg-card border-border sm:max-w-lg"><DialogHeader><DialogTitle>Nouvel abonnement</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label>Nom</Label><Input value={subForm.name} onChange={e=>setSubForm(x=>({...x,name:e.target.value}))} placeholder="Netflix, salle, téléphone…"/></div><div><Label>Montant</Label><Input type="number" step="0.01" value={subForm.amount||''} onChange={e=>setSubForm(x=>({...x,amount:Number(e.target.value)}))}/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Fréquence</Label><Select value={subForm.frequency} onValueChange={(v:any)=>setSubForm(x=>({...x,frequency:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuel</SelectItem><SelectItem value="yearly">Annuel</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem></SelectContent></Select></div><div><Label>Prochain prélèvement</Label><Input type="date" value={subForm.nextDate} onChange={e=>setSubForm(x=>({...x,nextDate:e.target.value}))}/></div></div><div><Label>Compte débité</Label><Select value={subForm.accountId} onValueChange={v=>setSubForm(x=>({...x,accountId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><Button onClick={saveSub} className="w-full bg-emerald-600 hover:bg-emerald-500">Enregistrer</Button></div></DialogContent></Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}><DialogContent className="bg-card border-border sm:max-w-lg"><DialogHeader><DialogTitle>Virement automatique / ponctuel</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label>Compte source</Label><Select value={transferForm.fromAccountId} onValueChange={v=>setTransferForm(x=>({...x,fromAccountId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Compte destination</Label><Select value={transferForm.toAccountId} onValueChange={v=>setTransferForm(x=>({...x,toAccountId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Montant</Label><Input type="number" step="0.01" value={transferForm.amount||''} onChange={e=>setTransferForm(x=>({...x,amount:Number(e.target.value)}))}/></div><div><Label>Date</Label><Input type="date" value={transferForm.date} onChange={e=>setTransferForm(x=>({...x,date:e.target.value}))}/></div></div><div className="flex items-center gap-2 p-3 rounded-xl border border-border"><Checkbox checked={transferForm.recurring} onCheckedChange={v=>setTransferForm(x=>({...x,recurring:Boolean(v)}))}/><div><p className="text-xs font-medium">Virement récurrent</p><p className="text-[10px] text-muted-foreground">Suivi d’un virement automatique vers ton épargne / investissement.</p></div></div>{transferForm.recurring&&<div className="grid grid-cols-2 gap-3"><div><Label>Fréquence</Label><Select value={transferForm.frequency} onValueChange={(v:any)=>setTransferForm(x=>({...x,frequency:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuel</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem><SelectItem value="yearly">Annuel</SelectItem></SelectContent></Select></div><div><Label>Prochaine date</Label><Input type="date" value={transferForm.nextDate} onChange={e=>setTransferForm(x=>({...x,nextDate:e.target.value}))}/></div></div>}<Button onClick={saveTransfer} className="w-full bg-emerald-600 hover:bg-emerald-500">Enregistrer</Button></div></DialogContent></Dialog>
    </div>
  );
}

function Metric({title,value,icon,tone}:{title:string;value:string;icon:ReactNode;tone:string}){return <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{title}</span><span className={tone}>{icon}</span></div><p className="font-mono text-lg font-bold mt-3">{value}</p></div>}
function Card({title,subtitle,children}:{title:string;subtitle?:string;children:ReactNode}){return <section className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="mb-3"><h2 className="text-sm font-semibold">{title}</h2>{subtitle&&<p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}</div>{children}</section>}
function Empty({text}:{text:string}){return <div className="h-full min-h-[120px] flex items-center justify-center text-xs text-muted-foreground">{text}</div>}

function TransactionsView({transactions,accounts,onAdd,onEdit,onDelete}:{transactions:FinanceTransaction[];accounts:FinanceAccount[];onAdd:()=>void;onEdit:(x:FinanceTransaction)=>void;onDelete:(x:FinanceTransaction)=>void}){const [filter,setFilter]=useState('');const list=transactions.filter(t=>!filter||t.description.toLowerCase().includes(filter.toLowerCase())||t.category.toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));return <div className="space-y-4"><Header title="Transactions" subtitle={`${transactions.length} opérations enregistrées · modification en temps réel des soldes`} action={<Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1"/>Ajouter</Button>} /><Input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Rechercher une transaction…" className="max-w-sm"/><div className="rounded-2xl border border-border overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[100px_minmax(140px,1fr)_140px_150px_120px_72px] gap-3 px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30"><span>Date</span><span>Description</span><span>Catégorie</span><span>Compte</span><span className="text-right">Montant</span><span/></div>{list.map(t=><div key={t.id} className="grid grid-cols-[100px_minmax(140px,1fr)_140px_150px_120px_72px] gap-3 items-center px-4 py-3 border-t border-border/50 text-xs"><span className="text-muted-foreground">{t.date}</span><span className="font-medium truncate">{t.description}</span><span className="text-muted-foreground truncate">{t.category}</span><span className="text-muted-foreground truncate">{accounts.find(a=>a.id===t.accountId)?.name||'—'}</span><span className={`text-right font-mono font-semibold ${t.type==='income'?'text-emerald-400':'text-rose-400'}`}>{t.type==='income'?'+':'-'}{eur(t.amount)}</span><div className="flex justify-end items-center gap-0.5"><button onClick={()=>onEdit(t)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Modifier" title="Modifier"><Pencil className="h-3.5 w-3.5"/></button><button onClick={()=>onDelete(t)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors" aria-label="Supprimer" title="Supprimer"><X className="h-3.5 w-3.5"/></button></div></div>)}{!list.length&&<div className="p-10 text-center text-xs text-muted-foreground">Aucune transaction.</div>}</div></div></div>}
function AccountsView({accounts,onNew,onEdit,onDelete,onStatements}:{accounts:FinanceAccount[];onNew:()=>void;onEdit:(a:FinanceAccount)=>void;onDelete:(a:FinanceAccount)=>void;onStatements:(a:FinanceAccount)=>void}){return <div className="space-y-4"><Header title="Comptes & patrimoine" subtitle="Tous tes comptes financiers au même endroit" action={<Button size="sm" onClick={onNew}><Plus className="h-4 w-4 mr-1"/>Nouveau compte</Button>}/><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{accounts.map(a=><div key={a.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center"><Landmark className="h-5 w-5 text-sky-400"/></div><div><p className="font-semibold text-sm">{a.name}</p><p className="text-[10px] text-muted-foreground">{a.type} · {a.institution||'—'}</p></div></div><div className="flex gap-1"><button className="p-1.5 text-muted-foreground hover:text-foreground" onClick={()=>onEdit(a)}><Settings2 className="h-3.5 w-3.5"/></button><button className="p-1.5 text-muted-foreground hover:text-rose-400" onClick={()=>onDelete(a)}><X className="h-3.5 w-3.5"/></button></div></div><p className="font-mono text-2xl font-bold mt-5">{eur(a.balance)}</p><div className="flex items-center justify-between mt-1"><p className="text-[10px] text-muted-foreground">{a.currency}</p><button className="text-[11px] text-sky-400 hover:underline" onClick={()=>onStatements(a)}>Relevés & évolution →</button></div></div>)}{!accounts.length&&<Empty text="Crée ton premier compte bancaire, épargne ou investissement."/>}</div></div>}

function SubscriptionsView({subscriptions,accounts,onNew,onToggle,onDelete}:{subscriptions:FinanceSubscription[];accounts:FinanceAccount[];onNew:()=>void;onToggle:(s:FinanceSubscription)=>void;onDelete:(s:FinanceSubscription)=>void}){const monthly=subscriptions.filter(s=>s.active).reduce((s,x)=>s+(x.frequency==='monthly'?x.amount:x.frequency==='yearly'?x.amount/12:x.amount*52/12),0);return <div className="space-y-4"><Header title="Abonnements" subtitle={`${eur(monthly)} / mois estimés · ${subscriptions.filter(x=>x.active).length} actifs`} action={<Button size="sm" onClick={onNew}><Plus className="h-4 w-4 mr-1"/>Ajouter</Button>}/><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{subscriptions.map(s=><div key={s.id} className={`rounded-2xl border p-4 ${s.active?'border-border bg-card':'border-border/50 bg-muted/20 opacity-60'}`}><div className="flex justify-between gap-3"><div><p className="font-semibold text-sm">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.category} · {accounts.find(a=>a.id===s.accountId)?.name||'—'}</p></div><p className="font-mono font-bold">{eur(s.amount)}</p></div><div className="flex items-center justify-between mt-5 text-[10px] text-muted-foreground"><span>Prochain : {s.nextDate}</span><div className="flex gap-2"><button onClick={()=>onToggle(s)} className="text-emerald-400">{s.active?'Désactiver':'Réactiver'}</button><button onClick={()=>onDelete(s)} className="text-rose-400">Supprimer</button></div></div></div>)}</div></div>}

function TransfersView({transfers,accounts,onNew,onDelete}:{transfers:FinanceTransfer[];accounts:FinanceAccount[];onNew:()=>void;onDelete:(t:FinanceTransfer)=>void}){return <div className="space-y-4"><Header title="Virements" subtitle="Transferts ponctuels et virements automatiques à suivre" action={<Button size="sm" onClick={onNew}><Plus className="h-4 w-4 mr-1"/>Nouveau virement</Button>}/><div className="space-y-2">{transfers.map(t=><div key={t.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center"><Repeat2 className="h-4 w-4 text-violet-400"/></div><div><p className="text-xs font-medium">{accounts.find(a=>a.id===t.fromAccountId)?.name||'—'} <span className="text-muted-foreground">→</span> {accounts.find(a=>a.id===t.toAccountId)?.name||'—'}</p><p className="text-[10px] text-muted-foreground">{t.date}{t.recurring?` · ${t.frequency} · prochain ${t.nextDate}`:''}</p></div></div><div className="flex items-center gap-4"><span className="font-mono font-semibold">{eur(t.amount)}</span><button onClick={()=>onDelete(t)} className="text-muted-foreground hover:text-rose-400"><X className="h-3.5 w-3.5"/></button></div></div>)}{!transfers.length&&<Empty text="Aucun virement enregistré."/>}</div></div>}
function Header({title,subtitle,action}:{title:string;subtitle:string;action:ReactNode}){return <div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">{title}</h1><p className="text-xs text-muted-foreground mt-1">{subtitle}</p></div>{action}</div>}
