import { usePagePreference, oneOf } from '@/hooks/usePagePreference';
import { useDialogDraft } from '@/hooks/useDialogDraft';
import { FormField } from '@/components/ui/form-field';
import DashboardFilter from '@/components/trading/DashboardFilter';
import { useFinanceAccount } from '@/hooks/useFinanceAccount';
import SlidingRailLinks from '@/components/trading/SlidingRailLinks';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState, useRef, useEffect, type ReactNode, type FormEvent } from 'react';
import WorkspaceRail from '@/components/trading/WorkspaceRail';
import { TopNav } from '@/components/trading/TopNav';
import { InvestmentView } from '@/components/finance/InvestmentView';
import { type FinanceStatement } from '@/components/finance/StatementsView';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  LayoutDashboard, List, ArrowDownLeft, ArrowRightLeft, ArrowUpRight, ChevronLeft, ChevronRight,
  Landmark, Pencil, Plus, Repeat2, Save, Search, TrendingUp, X, PiggyBank,
} from 'lucide-react';
import { YearFlowBars, CashflowChart, FlowAreaChart, Donut, AccountBars, PALETTE } from '@/components/finance/financeCharts';
import { Card, CategoryTile, Empty, Segmented, SplitBar, Stat, Tile, eur } from '@/components/finance/ui';
import { toast } from 'sonner';

interface FinanceAccount { id: string; name: string; type: string; institution: string; balance: number; openingBalance?: number; currency: string; color?: string; archived?: boolean; initialCapital?: number | null; initialDate?: string | null; }
interface FinanceTransaction { id: string; date: string; description: string; amount: number; type: 'income' | 'expense'; accountId: string; category: string; notes?: string; }
interface FinanceSubscription { id: string; name: string; amount: number; frequency: 'monthly' | 'yearly' | 'weekly'; nextDate: string; accountId: string; category: string; active: boolean; }
interface FinanceTransfer { id: string; date: string; fromAccountId: string; toAccountId: string; amount: number; recurring: boolean; frequency?: 'monthly' | 'weekly' | 'yearly'; nextDate?: string; active: boolean; }

type Tab = 'overview' | 'transactions' | 'accounts' | 'subscriptions' | 'transfers' | 'invest';

const ACCOUNT_TYPES = ['Compte courant', 'Épargne', 'Assurance-vie', 'PEA', 'CTO', 'Crypto', 'Espèces', 'Autre'];
const EXPENSE_CATEGORIES = ['Logement', 'Alimentation', 'Transport', 'Abonnements', 'Loisirs', 'Shopping', 'Santé', 'Formation', 'Trading', 'Famille', 'Impôts', 'Autre'];
const INCOME_CATEGORIES = ['Salaire', 'Trading', 'Payout', 'Remboursement', 'Intérêts', 'Vente', 'Autre'];
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const dateKey = (d: string) => String(d || '').slice(0, 10);
const monthKey = (d: string) => dateKey(d).slice(0, 7);
// Dates en heure LOCALE (toISOString convertit en UTC et fait reculer d'un mois/jour en France)
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => localDate(new Date());
const monthKeyOf = (d: Date) => localDate(d).slice(0, 7);

const emptyTx: FinanceTransaction = { id: '', date: todayStr(), description: '', amount: 0, type: 'expense', accountId: '', category: 'Autre', notes: '' };

export default function Finance({ onEnterInvest }: { onEnterInvest?: () => void }) {
  const { data, addRow, updateRow, deleteRow } = useData();
  const accounts = useMemo(() => Array.isArray(data?.financeAccounts) ? data.financeAccounts : [], [data?.financeAccounts]) as FinanceAccount[];
  const transactions = useMemo(() => Array.isArray(data?.financeTransactions) ? data.financeTransactions : [], [data?.financeTransactions]) as FinanceTransaction[];
  const subscriptions = useMemo(() => Array.isArray(data?.financeSubscriptions) ? data.financeSubscriptions : [], [data?.financeSubscriptions]) as FinanceSubscription[];
  const transfers = useMemo(() => Array.isArray(data?.financeTransfers) ? data.financeTransfers : [], [data?.financeTransfers]) as FinanceTransfer[];
  const statements = useMemo(() => Array.isArray(data?.financeStatements) ? data.financeStatements : [], [data?.financeStatements]) as FinanceStatement[];
  const [selectedAccount, selectAccount] = useFinanceAccount(accounts);
  const scopedAccounts = selectedAccount === 'all' ? accounts : accounts.filter(account => account.id === selectedAccount);
  const scopedTransactions = useMemo(()=>transactions.filter(transaction => selectedAccount === 'all' || transaction.accountId === selectedAccount),[transactions,selectedAccount]);
  const scopedSubscriptions = subscriptions.filter(subscription => selectedAccount === 'all' || subscription.accountId === selectedAccount);
  const scopedTransfers = transfers.filter(transfer => selectedAccount === 'all' || transfer.fromAccountId === selectedAccount || transfer.toAccountId === selectedAccount);
  const scopedStatements = statements.filter(statement => selectedAccount === 'all' || statement.accountId === selectedAccount);
  const [tab, setTab] = usePagePreference<Tab>('finance.page','overview',oneOf('overview','transactions','accounts','subscriptions','transfers','invest'));
  const [investmentStart, setInvestmentStart] = useState<string | undefined>();
  const [overviewMode, setOverviewMode] = usePagePreference<'month'|'year'>('finance.overview.mode','month',oneOf('month','year'));
  const [cursor, setCursor] = usePagePreference('finance.overview.date',new Date());
  const [txOpen, setTxOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [financeAttempt,setFinanceAttempt] = useState('');
  const [financeBusy,setFinanceBusy] = useState(false);
  const [financeError,setFinanceError] = useState('');
  const financeLock = useRef(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [tx, setTx] = useState<FinanceTransaction>({ ...emptyTx });
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [accountForm, setAccountForm] = useState<FinanceAccount>({ id: '', name: '', type: 'Compte courant', institution: '', balance: 0, currency: 'EUR' });
  const [subForm, setSubForm] = useState<FinanceSubscription>({ id: '', name: '', amount: 0, frequency: 'monthly', nextDate: todayStr(), accountId: '', category: 'Abonnements', active: true });
  const [transferForm, setTransferForm] = useState<FinanceTransfer>({ id: '', date: todayStr(), fromAccountId: '', toAccountId: '', amount: 0, recurring: false, frequency: 'monthly', nextDate: todayStr(), active: true });

  const accountSignature = accounts.map(account=>account.id).sort().join(',');
  const [draftScope,setDraftScope] = useState(accountSignature);
  useEffect(()=>{
    // A successful account creation changes the account list. Keep the draft namespace
    // stable until the dialog has closed so its saved draft can be cleared exactly once.
    if (!txOpen && !accountOpen && !subOpen && !transferOpen) setDraftScope(accountSignature);
  },[accountSignature,txOpen,accountOpen,subOpen,transferOpen]);
  const txDraft = useDialogDraft(`finance:${draftScope}:transaction:${tx.id||'new'}`,txOpen,tx,setTx);
  const accountDraft = useDialogDraft(`finance:${draftScope}:account:${editingAccount?.id||'new'}`,accountOpen,accountForm,setAccountForm);
  const subDraft = useDialogDraft(`finance:${draftScope}:subscription:${subForm.id||'new'}`,subOpen,subForm,setSubForm);
  const transferDraft = useDialogDraft(`finance:${draftScope}:transfer`,transferOpen,transferForm,setTransferForm);

  const key = monthKeyOf(cursor);
  const monthLabel = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthTx = useMemo(() => scopedTransactions.filter(t => monthKey(t.date) === key), [scopedTransactions, key]);
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
  const balance = scopedAccounts.reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const investmentBalance = scopedAccounts.filter(a => ['PEA', 'CTO', 'Assurance-vie', 'Crypto'].includes(a.type)).reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0);
  const cashBalance = scopedAccounts.filter(a => ['Compte courant', 'Épargne', 'Espèces'].includes(a.type)).reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0);

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
      const txs = scopedTransactions.filter(t => monthKey(t.date) === prefix);
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { month: new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), income, expenses, cashflow: income - expenses, savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0 };
    });
  }, [cursor, scopedTransactions]);

  const yearTotals = useMemo(() => yearData.reduce((a, m) => ({ income: a.income + m.income, expenses: a.expenses + m.expenses, cashflow: a.cashflow + m.cashflow }), { income: 0, expenses: 0, cashflow: 0 }), [yearData]);
  const yearSavingsRate = yearTotals.income > 0 ? (yearTotals.cashflow / yearTotals.income) * 100 : 0;

  const accountData = scopedAccounts.filter(a => !a.archived).map(a => ({ name: a.name, balance: accountBalances[a.id] ?? 0 }));
  const upcomingSubs = scopedSubscriptions.filter(s => s.active).sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 6);
  const recurringMonthly = scopedSubscriptions.filter(s => s.active).reduce((s, x) => s + (x.frequency === 'monthly' ? x.amount : x.frequency === 'yearly' ? x.amount / 12 : x.amount * 52 / 12), 0);


  const accountName = (accountId: string) => accounts.find(a => a.id === accountId)?.name || 'Compte supprimé';

  const saveTx = async () => {
    if (!tx.description || !tx.accountId || tx.amount <= 0) return toast.error('Complète la description, le compte et le montant.');
    const row = { ...tx, id: tx.id || id('tx'), amount: Math.abs(Number(tx.amount)) };
    if (tx.id) await updateRow('financeTransactions', tx.id, row); else await addRow('financeTransactions', row);
    setTxOpen(false); setTx({ ...emptyTx, accountId: selectedAccount !== 'all' ? selectedAccount : accounts[0]?.id || '' }); toast.success('Transaction enregistrée');
  };

  const saveAccount = async () => {
    if (!accountForm.name) return toast.error('Donne un nom au compte.');
    const txNet = editingAccount ? transactions.filter(t => t.accountId === editingAccount.id).reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0) : 0;
    const transferNet = editingAccount ? transfers.reduce((sum, t) => sum + (t.toAccountId === editingAccount.id ? Number(t.amount) : t.fromAccountId === editingAccount.id ? -Number(t.amount) : 0), 0) : 0;
    const openingBalance = editingAccount ? Number(accountForm.balance) - txNet - transferNet : Number(accountForm.balance);
    const row = { ...accountForm, id: accountForm.id || id('acc'), balance: Number(accountForm.balance), openingBalance };
    if (editingAccount) await updateRow('financeAccounts', editingAccount.id, row); else await addRow('financeAccounts', row);
    setAccountOpen(false); setEditingAccount(null); toast.success('Compte enregistré');
  };

  const saveSub = async () => {
    if (!subForm.name || !subForm.accountId || subForm.amount <= 0) return toast.error('Complète les informations de l’abonnement.');
    const row = { ...subForm, id: subForm.id || id('sub'), amount: Math.abs(Number(subForm.amount)) };
    if (subForm.id) await updateRow('financeSubscriptions', subForm.id, row); else await addRow('financeSubscriptions', row);
    setSubOpen(false); setSubForm({ ...subForm, id: '', name: '', amount: 0 }); toast.success('Abonnement enregistré');
  };

  const saveTransfer = async () => {
    if (!transferForm.fromAccountId || !transferForm.toAccountId || transferForm.fromAccountId === transferForm.toAccountId || transferForm.amount <= 0) return toast.error('Choisis deux comptes différents et un montant valide.');
    await addRow('financeTransfers', { ...transferForm, id: id('trf'), amount: Math.abs(Number(transferForm.amount)) });
    setTransferOpen(false); toast.success('Virement enregistré');
  };

  const saveStatement = async (statement: FinanceStatement, isEdit: boolean, applyBalance: boolean) => {
    if (isEdit) await updateRow('financeStatements', statement.id, statement); else await addRow('financeStatements', statement);
    if (!applyBalance) return;
    // Applique la valeur au solde du compte seulement si c'est le relevé le plus récent
    const latest = [...statements.filter(x => x.accountId === statement.accountId && x.id !== statement.id), statement].sort((a, b) => a.date.localeCompare(b.date)).pop();
    if (latest?.id !== statement.id) return;
    const acc = accounts.find(a => a.id === statement.accountId);
    if (!acc) return;
    const txNet = transactions.filter(t => t.accountId === acc.id).reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    const transferNet = transfers.reduce((sum, t) => sum + (t.toAccountId === acc.id ? Number(t.amount) : t.fromAccountId === acc.id ? -Number(t.amount) : 0), 0);
    await updateRow('financeAccounts', acc.id, { balance: statement.totalValue, openingBalance: statement.totalValue - txNet - transferNet });
  };

  const deleteStatement = async (statement: FinanceStatement) => { await deleteRow('financeStatements', statement.id); };

  const setInitialCapital = async (accountId: string, capital: number | null, date: string | null) => {
    await updateRow('financeAccounts', accountId, { initialCapital: capital, initialDate: date });
  };

  const financeErrors = {
    tx: { description: !tx.description ? 'Indique une description.' : '', account: !tx.accountId ? 'Choisis un compte.' : '', amount: !(tx.amount > 0) ? 'Indique un montant supérieur à zéro.' : '' },
    account: { name: !accountForm.name ? 'Donne un nom au compte.' : '' },
    sub: { name: !subForm.name ? 'Indique le nom de l’abonnement.' : '', account: !subForm.accountId ? 'Choisis le compte débité.' : '', amount: !(subForm.amount > 0) ? 'Indique un montant supérieur à zéro.' : '' },
    transfer: { from: !transferForm.fromAccountId ? 'Choisis le compte source.' : '', to: !transferForm.toAccountId ? 'Choisis le compte destination.' : transferForm.toAccountId === transferForm.fromAccountId ? 'Choisis un compte différent de la source.' : '', amount: !(transferForm.amount > 0) ? 'Indique un montant supérieur à zéro.' : '' },
  };
  const fieldError = (kind: keyof typeof financeErrors, key: string) => financeAttempt === kind ? (financeErrors[kind] as Record<string,string>)[key] : undefined;
  const submitFinance = async (event: FormEvent<HTMLFormElement>, kind: keyof typeof financeErrors, action: () => Promise<unknown>) => {
    event.preventDefault(); if (financeLock.current) return;
    setFinanceAttempt(kind); setFinanceError('');
    if (Object.values(financeErrors[kind]).some(Boolean)) {
      const form = event.currentTarget;
      requestAnimationFrame(()=>form.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    financeLock.current=true; setFinanceBusy(true);
    try { await action(); ({tx:txDraft,account:accountDraft,sub:subDraft,transfer:transferDraft}[kind]).clear(); setFinanceAttempt(''); }
    catch (error) { setFinanceError(error instanceof Error ? error.message : 'L’enregistrement a échoué. La saisie est conservée ; réessaie.'); }
    finally { financeLock.current=false; setFinanceBusy(false); }
  };
  const closeFinance = (setter: (open:boolean)=>void, value:boolean) => {
    if (financeLock.current) return;
    setter(value); setFinanceError(''); setFinanceAttempt('');
  };

  const TABS: [Tab, string, LucideIcon][] = [['overview', 'Vue d’ensemble', LayoutDashboard], ['transactions', 'Transactions', List], ['accounts', 'Comptes', Landmark], ['invest', 'Invest', TrendingUp], ['subscriptions', 'Abonnements', Repeat2], ['transfers', 'Virements', ArrowRightLeft]];
  const openNewTx = () => { setTx({ ...emptyTx, accountId: selectedAccount !== 'all' ? selectedAccount : accounts[0]?.id || '' }); setTxOpen(true); };
  const prev = () => setCursor(new Date(cursor.getFullYear() + (overviewMode === 'year' ? -1 : 0), cursor.getMonth() + (overviewMode === 'month' ? -1 : 0), 1));
  const next = () => setCursor(new Date(cursor.getFullYear() + (overviewMode === 'year' ? 1 : 0), cursor.getMonth() + (overviewMode === 'month' ? 1 : 0), 1));
  const otherBalance = balance - cashBalance - investmentBalance;
  const recentTx = [...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const topCategories = categoryData.slice(0, 6);
  const expenseTotal = categoryData.reduce((s, c) => s + c.value, 0);

  const accountFilter = <DashboardFilter label="Compte" ariaLabel="Compte Finance" value={selectedAccount} onChange={selectAccount} options={[{value:'all',label:'Tous les comptes'},...accounts.map(account => ({value:account.id,label:account.name}))]} />;

  return (
    <div className="workspace-shell finance-workspace min-h-screen text-foreground relative z-10">
      <a href="#main-content" className="ui-skip-link">Aller au contenu</a>
      <WorkspaceRail><nav className="rail-nav" aria-label="Navigation My Finance"><SlidingRailLinks>{TABS.map(([value, label, Icon]) => <button type="button" key={value} data-rail-link aria-current={tab === value ? 'page' : undefined} onClick={() => { if (value === 'invest') { setInvestmentStart(undefined); if (tab !== 'invest') onEnterInvest?.(); } setTab(value); }} className={`rail-link${tab === value ? ' is-current' : ''}`}><Icon className="header-nav-icon" aria-hidden="true" strokeWidth={1.8} /><span>{label}</span></button>)}</SlidingRailLinks></nav><TopNav sidebar utilitiesOnly /></WorkspaceRail>

      <main id="main-content" tabIndex={-1} className="finance-main">
        {tab === 'overview' && <div className="finance-toolbar">
          <div className="dashboard-filter-controls">
            {accountFilter}
            {tab === 'overview' && <div className="finance-period-field"><span className="dashboard-filter-caption">Période</span><div className="finance-period">
              <button type="button" onClick={prev} aria-label="Période précédente"><ChevronLeft className="h-4 w-4" /></button>
              <span>{overviewMode === 'month' ? monthLabel : cursor.getFullYear()}</span>
              <button type="button" onClick={next} aria-label="Période suivante"><ChevronRight className="h-4 w-4" /></button>
            </div></div>}
          </div>
          {tab === 'overview' && <div className="finance-toolbar-actions"><Segmented<'month' | 'year'> value={overviewMode} onChange={setOverviewMode} options={[[ 'month','Mois'],['year','Année']]} /><Button className="gap-2" onClick={openNewTx}><Plus className="h-4 w-4" />Transaction</Button></div>}
        </div>}
        <div key={tab} className="finance-content">
        {tab === 'overview' && overviewMode === 'year' && <>
          <div className="finance-metrics finance-metrics-four">
            <Stat label="Revenus annuels" value={eur(yearTotals.income)} icon={<ArrowDownLeft className="h-4 w-4" />} color="hsl(var(--profit))" />
            <Stat label="Dépenses annuelles" value={eur(-yearTotals.expenses)} icon={<ArrowUpRight className="h-4 w-4" />} color="hsl(var(--loss))" />
            <Stat label="Cash-flow annuel" value={eur(yearTotals.cashflow)} icon={<TrendingUp className="h-4 w-4" />} color={yearTotals.cashflow >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'} />
            <Stat label="Taux d’épargne annuel" value={yearTotals.income > 0 ? `${yearSavingsRate.toLocaleString('fr-FR',{maximumFractionDigits:1})} %` : '—'} percent={yearSavingsRate} icon={<PiggyBank className="h-4 w-4" />} color={PALETTE[0]} />
          </div>
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8">
            <Card title={`Flux de ${cursor.getFullYear()}`} subtitle="Revenus et dépenses par mois"><div className="h-[320px]"><YearFlowBars data={yearData} /></div></Card>
            <Card title="Cash-flow mensuel" subtitle="Évolution sur l’année"><div className="h-[320px]"><CashflowChart data={yearData} /></div></Card>
          </div>
          <Card title="Détail des 12 mois" subtitle="Vue complète de l’année">
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead><tr className="text-muted-foreground text-xs"><th className="text-left font-medium px-2 py-2.5">Mois</th><th className="text-right font-medium px-2 py-2.5">Revenus</th><th className="text-right font-medium px-2 py-2.5">Dépenses</th><th className="text-right font-medium px-2 py-2.5">Cash-flow</th><th className="text-right font-medium px-2 py-2.5">Taux d’épargne</th></tr></thead>
                <tbody>{yearData.map(m => (
                  <tr key={m.month} className="border-t border-border/70 hover:bg-secondary/50 transition-colors">
                    <td className="px-2 py-3 capitalize font-medium">{m.month}</td>
                    <td className="px-2 py-3 text-right text-profit font-mono">{eur(m.income)}</td>
                    <td className="px-2 py-3 text-right text-loss font-mono">{eur(m.expenses)}</td>
                    <td className={`px-2 py-3 text-right font-mono font-semibold ${m.cashflow >= 0 ? 'text-profit' : 'text-loss'}`}>{eur(m.cashflow)}</td>
                    <td className="px-2 py-3 text-right font-mono text-muted-foreground">{m.savingsRate.toFixed(1)} %</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </Card>
        </>}

        {tab === 'overview' && overviewMode === 'month' && <>
          <div className="finance-metrics">
            <Stat label="Patrimoine suivi" value={eur(balance)} />
            <Stat label="Revenus du mois" value={eur(income)} color="hsl(var(--profit))" />
            <Stat label="Dépenses du mois" value={eur(-expenses)} color="hsl(var(--loss))" />
            <Stat label="Cash-flow net" value={eur(income-expenses)} color={income-expenses >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'} />
            <Stat label="Taux d’épargne" value={income > 0 ? `${savingsRate.toLocaleString('fr-FR',{maximumFractionDigits:1})} %` : '—'} percent={savingsRate} />
          </div>
          <div className="grid lg:grid-cols-[1.65fr_1fr] gap-8">
            <Card title="Progression du cash-flow" action={<span className="text-xs capitalize text-muted-foreground">{monthLabel}</span>}>
              <div className="h-[300px] sm:h-[340px]"><FlowAreaChart data={trendData} lastIndex={trendData.length-1} /></div>
              <div className="mt-5"><SplitBar parts={[
                {label:'Liquidités',value:cashBalance,color:PALETTE[4]},
                {label:'Investissements',value:investmentBalance,color:PALETTE[0]},
                {label:'Autres',value:otherBalance,color:PALETTE[7]},
              ]} /></div>
            </Card>

            <Card title="Dépenses par catégorie" subtitle={<span className="capitalize">{monthLabel}</span>}>
              {categoryData.length ? <>
                <div className="h-[190px]"><Donut data={categoryData} centerLabel="dépensés" /></div>
                <div className="mt-5 space-y-3.5">
                  {topCategories.map((x, i) => {
                    const pct = expenseTotal > 0 ? (x.value / expenseTotal) * 100 : 0;
                    const color = PALETTE[i % PALETTE.length];
                    return (
                      <div key={x.name} className="flex items-center gap-3">
                        <CategoryTile category={x.name} color={color} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2 text-[13px]"><span className="font-medium truncate">{x.name}</span><span className="font-mono font-semibold">{eur(x.value)}</span></div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: color }} /></div>
                        </div>
                        <span className="w-10 text-right text-xs text-muted-foreground font-mono">{Math.round(pct)} %</span>
                      </div>
                    );
                  })}
                  {categoryData.length > topCategories.length && <p className="text-xs text-muted-foreground">+ {categoryData.length - topCategories.length} autre{categoryData.length - topCategories.length > 1 ? 's' : ''} catégorie{categoryData.length - topCategories.length > 1 ? 's' : ''}</p>}
                </div>
              </> : <Empty text="Aucune dépense ce mois-ci" />}
            </Card>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
            <Card title="Dernières opérations" subtitle={`${monthTx.length} ce mois-ci`} action={<button onClick={() => setTab('transactions')} className="text-[13px] font-medium text-primary hover:underline">Tout voir</button>}>
              {recentTx.length ? <div className="-mx-2">{recentTx.map(t => <TxRow key={t.id} t={t} accountName={accountName(t.accountId)} />)}</div> : <Empty text="Aucune opération ce mois-ci" />}
            </Card>
            <Card title="Abonnements à venir" subtitle={`${eur(recurringMonthly)} / mois environ`}>
              <div className="space-y-1 -mx-2">{upcomingSubs.length ? upcomingSubs.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors">
                  <Tile color={PALETTE[5]}><Repeat2 className="h-[18px] w-[18px]" /></Tile>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-medium truncate">{s.name}</p><p className="text-xs text-muted-foreground truncate">{s.nextDate} · {accountName(s.accountId)}</p></div>
                  <span className="font-mono text-[13px] font-semibold">{eur(s.amount)}</span>
                </div>)) : <Empty text="Aucun abonnement" />}</div>
            </Card>
          </div>

          <Card title="Répartition des comptes" subtitle="Solde actuel"><div className="h-[230px]">{accountData.length ? <AccountBars data={accountData} /> : <Empty text="Crée ton premier compte" />}</div></Card>
        </>}

        {tab === 'transactions' && <TransactionsView accountFilter={accountFilter} transactions={scopedTransactions} accounts={accounts} onAdd={openNewTx} onEdit={(x) => { setTx(x); setTxOpen(true); }} onDelete={async (x) => { await deleteRow('financeTransactions', x.id); toast.success('Transaction supprimée'); }} />}
        {tab === 'accounts' && <AccountsView onStatements={(a) => { selectAccount(a.id); setInvestmentStart(a.id); onEnterInvest?.(); setTab('invest'); }} accounts={accounts.map(a => ({ ...a, balance: accountBalances[a.id] ?? Number(a.balance || 0) }))} onNew={() => { setEditingAccount(null); setAccountForm({ id: '', name: '', type: 'Compte courant', institution: '', balance: 0, currency: 'EUR' }); setAccountOpen(true); }} onEdit={(a) => { const original = accounts.find(x => x.id === a.id) || a; setEditingAccount(original); setAccountForm(a); setAccountOpen(true); }} onDelete={async a => { await deleteRow('financeAccounts', a.id); toast.success('Compte supprimé'); }} />}
        {tab === 'invest' && <InvestmentView accounts={accounts} statements={scopedStatements} initialAccountId={investmentStart} selectedAccountId={selectedAccount} onAccountChange={selectAccount} onSave={saveStatement} onDelete={deleteStatement} onSetInitial={setInitialCapital} />}
        {tab === 'subscriptions' && <SubscriptionsView accountFilter={accountFilter} subscriptions={scopedSubscriptions} accounts={accounts} onNew={() => { setSubForm({ ...subForm, id: '', name: '', amount: 0, accountId: selectedAccount !== 'all' ? selectedAccount : accounts[0]?.id || '' }); setSubOpen(true); }} onToggle={async s => await updateRow('financeSubscriptions', s.id, { active: !s.active })} onDelete={async s => { await deleteRow('financeSubscriptions', s.id); toast.success('Abonnement supprimé'); }} />}
        {tab === 'transfers' && <TransfersView accountFilter={accountFilter} transfers={scopedTransfers} accounts={accounts} onNew={() => { setTransferForm({ ...transferForm, id: '', fromAccountId: accounts[0]?.id || '', toAccountId: accounts[1]?.id || '' }); setTransferOpen(true); }} onDelete={async t => { await deleteRow('financeTransfers', t.id); toast.success('Virement supprimé'); }} />}
        </div>
      </main>

      <Dialog open={txOpen} onOpenChange={value=>closeFinance(setTxOpen,value)}>
        <DialogContent className="finance-editor bg-background sm:max-w-xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{tx.id ? 'Modifier la transaction' : 'Nouvelle transaction'}</DialogTitle></DialogHeader>
          <FinanceForm draftStatus={txDraft.status} busy={financeBusy} error={financeError} onSubmit={event=>submitFinance(event,'tx',saveTx)}>
            <div className="dashboard-switch w-full" role="group" aria-label="Nature de l’opération">
              <button type="button" aria-pressed={tx.type==='expense'} onClick={()=>setTx(x=>({...x,type:'expense',category:'Autre'}))}>Dépense</button>
              <button type="button" aria-pressed={tx.type==='income'} onClick={()=>setTx(x=>({...x,type:'income',category:'Autre'}))}>Revenu</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Date">{field=><Input {...field} type="date" value={tx.date} onChange={event=>setTx(x=>({...x,date:event.target.value}))} />}</FormField>
              <FormField label="Montant" required error={fieldError('tx','amount')}>{field=><Input {...field} type="number" inputMode="decimal" step="0.01" min="0.01" value={tx.amount||''} onChange={event=>setTx(x=>({...x,amount:Number(event.target.value)}))} />}</FormField>
            </div>
            <FormField label="Description" required error={fieldError('tx','description')}>{field=><Input {...field} autoComplete="off" value={tx.description} onChange={event=>setTx(x=>({...x,description:event.target.value}))} placeholder="Courses, salaire, abonnement…" />}</FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Compte" required error={fieldError('tx','account')}>{field=><Select value={tx.accountId} onValueChange={value=>setTx(x=>({...x,accountId:value}))}><SelectTrigger {...field}><SelectValue placeholder="Choisir un compte" /></SelectTrigger><SelectContent className="dashboard-filter-menu-account">{accounts.map(account=><SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>}</FormField>
              <FormField label="Catégorie">{field=><Select value={tx.category} onValueChange={value=>setTx(x=>({...x,category:value}))}><SelectTrigger {...field}><SelectValue /></SelectTrigger><SelectContent>{(tx.type==='expense'?EXPENSE_CATEGORIES:INCOME_CATEGORIES).map(category=><SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select>}</FormField>
            </div>
            <FormField label="Note (facultatif)">{field=><Input {...field} value={tx.notes||''} onChange={event=>setTx(x=>({...x,notes:event.target.value}))} />}</FormField>
          </FinanceForm>
        </DialogContent>
      </Dialog>

      <Dialog open={accountOpen} onOpenChange={value=>closeFinance(setAccountOpen,value)}>
        <DialogContent className="finance-editor bg-background sm:max-w-xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingAccount?'Modifier le compte':'Nouveau compte'}</DialogTitle></DialogHeader>
          <FinanceForm draftStatus={accountDraft.status} busy={financeBusy} error={financeError} onSubmit={event=>submitFinance(event,'account',saveAccount)}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nom" required error={fieldError('account','name')}>{field=><Input {...field} value={accountForm.name} onChange={event=>setAccountForm(x=>({...x,name:event.target.value}))} placeholder="Compte courant" />}</FormField>
              <FormField label="Banque / établissement">{field=><Input {...field} value={accountForm.institution} onChange={event=>setAccountForm(x=>({...x,institution:event.target.value}))} placeholder="Boursobank, Fortuneo…" />}</FormField>
              <FormField label="Type">{field=><Select value={accountForm.type} onValueChange={value=>setAccountForm(x=>({...x,type:value}))}><SelectTrigger {...field}><SelectValue /></SelectTrigger><SelectContent>{ACCOUNT_TYPES.map(type=><SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>}</FormField>
              <FormField label="Solde actuel">{field=><Input {...field} type="number" inputMode="decimal" step="0.01" value={accountForm.balance||''} onChange={event=>setAccountForm(x=>({...x,balance:Number(event.target.value)}))} />}</FormField>
            </div>
            <FormField label="Devise">{field=><Input {...field} autoCapitalize="characters" value={accountForm.currency} onChange={event=>setAccountForm(x=>({...x,currency:event.target.value.toUpperCase()}))} />}</FormField>
          </FinanceForm>
        </DialogContent>
      </Dialog>

      <Dialog open={subOpen} onOpenChange={value=>closeFinance(setSubOpen,value)}>
        <DialogContent className="finance-editor bg-background sm:max-w-xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{subForm.id?'Modifier l’abonnement':'Nouvel abonnement'}</DialogTitle></DialogHeader>
          <FinanceForm draftStatus={subDraft.status} busy={financeBusy} error={financeError} onSubmit={event=>submitFinance(event,'sub',saveSub)}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nom" required error={fieldError('sub','name')}>{field=><Input {...field} value={subForm.name} onChange={event=>setSubForm(x=>({...x,name:event.target.value}))} placeholder="Netflix, salle, téléphone…" />}</FormField>
              <FormField label="Montant" required error={fieldError('sub','amount')}>{field=><Input {...field} type="number" inputMode="decimal" step="0.01" min="0.01" value={subForm.amount||''} onChange={event=>setSubForm(x=>({...x,amount:Number(event.target.value)}))} />}</FormField>
              <FormField label="Fréquence">{field=><Select value={subForm.frequency} onValueChange={(value:FinanceSubscription['frequency'])=>setSubForm(x=>({...x,frequency:value}))}><SelectTrigger {...field}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuel</SelectItem><SelectItem value="yearly">Annuel</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem></SelectContent></Select>}</FormField>
              <FormField label="Prochain prélèvement">{field=><Input {...field} type="date" value={subForm.nextDate} onChange={event=>setSubForm(x=>({...x,nextDate:event.target.value}))} />}</FormField>
            </div>
            <FormField label="Compte débité" required error={fieldError('sub','account')}>{field=><Select value={subForm.accountId} onValueChange={value=>setSubForm(x=>({...x,accountId:value}))}><SelectTrigger {...field}><SelectValue placeholder="Choisir un compte" /></SelectTrigger><SelectContent className="dashboard-filter-menu-account">{accounts.map(account=><SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>}</FormField>
          </FinanceForm>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={value=>closeFinance(setTransferOpen,value)}>
        <DialogContent className="finance-editor bg-background sm:max-w-xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Nouveau virement</DialogTitle></DialogHeader>
          <FinanceForm draftStatus={transferDraft.status} busy={financeBusy} error={financeError} onSubmit={event=>submitFinance(event,'transfer',saveTransfer)}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Compte source" required error={fieldError('transfer','from')}>{field=><Select value={transferForm.fromAccountId} onValueChange={value=>setTransferForm(x=>({...x,fromAccountId:value}))}><SelectTrigger {...field}><SelectValue placeholder="Choisir un compte" /></SelectTrigger><SelectContent className="dashboard-filter-menu-account">{accounts.map(account=><SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>}</FormField>
              <FormField label="Compte destination" required error={fieldError('transfer','to')}>{field=><Select value={transferForm.toAccountId} onValueChange={value=>setTransferForm(x=>({...x,toAccountId:value}))}><SelectTrigger {...field}><SelectValue placeholder="Choisir un compte" /></SelectTrigger><SelectContent className="dashboard-filter-menu-account">{accounts.map(account=><SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>}</FormField>
              <FormField label="Montant" required error={fieldError('transfer','amount')}>{field=><Input {...field} type="number" inputMode="decimal" step="0.01" min="0.01" value={transferForm.amount||''} onChange={event=>setTransferForm(x=>({...x,amount:Number(event.target.value)}))} />}</FormField>
              <FormField label="Date">{field=><Input {...field} type="date" value={transferForm.date} onChange={event=>setTransferForm(x=>({...x,date:event.target.value}))} />}</FormField>
            </div>
            <div className="flex min-h-12 items-center gap-3"><Checkbox id="finance-recurring" checked={transferForm.recurring} onCheckedChange={value=>setTransferForm(x=>({...x,recurring:Boolean(value)}))} /><Label htmlFor="finance-recurring" className="mb-0">Virement récurrent</Label></div>
            {transferForm.recurring && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Fréquence">{field=><Select value={transferForm.frequency} onValueChange={(value:FinanceTransfer['frequency'])=>setTransferForm(x=>({...x,frequency:value}))}><SelectTrigger {...field}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuel</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem><SelectItem value="yearly">Annuel</SelectItem></SelectContent></Select>}</FormField>
              <FormField label="Prochaine date">{field=><Input {...field} type="date" value={transferForm.nextDate} onChange={event=>setTransferForm(x=>({...x,nextDate:event.target.value}))} />}</FormField>
            </div>}
          </FinanceForm>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function FinanceForm({ children, busy, error, draftStatus, onSubmit }: {children:ReactNode;busy:boolean;error:string;draftStatus:'saved'|'memory'|null;onSubmit:(event:FormEvent<HTMLFormElement>)=>void}) {
  return <form noValidate onSubmit={onSubmit} className="space-y-6">
    <fieldset disabled={busy} className="space-y-5">{children}</fieldset>
    {error && <p role="alert" className="ui-field-error">{error}</p>}
    <div className="ui-form-footer"><p className="ui-draft-status" role="status">{draftStatus==='memory'?'Brouillon en mémoire · gardez cet onglet ouvert.':'Brouillon conservé dans cet onglet.'}</p><Button type="submit" loading={busy} className="w-full sm:w-auto">{busy?'Enregistrement…':'Enregistrer'}</Button></div>
  </form>;
}

/* ── Ligne d'opération réutilisée (vue d'ensemble + liste) ─────────────── */
function TxRow({ t, accountName, onEdit, onDelete }: { t: FinanceTransaction; accountName: string; onEdit?: (x: FinanceTransaction) => void; onDelete?: (x: FinanceTransaction) => void }) {
  const income = t.type === 'income';
  return (
    <div className="group flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors">
      <CategoryTile category={t.category} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium truncate">{t.description}</p>
        <p className="text-xs text-muted-foreground truncate">{t.category} · {accountName}</p>
      </div>
      <span className={`font-mono text-[13px] font-semibold shrink-0 ${income ? 'text-profit' : 'text-foreground'}`}>{income ? '+' : '-'}{eur(t.amount)}</span>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 shrink-0 md:opacity-100">
          {onEdit && <button onClick={() => onEdit(t)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Modifier"><Pencil className="h-3.5 w-3.5" /></button>}
          {onDelete && <button onClick={() => onDelete(t)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-loss hover:bg-loss-soft transition-colors" aria-label="Supprimer"><X className="h-3.5 w-3.5" /></button>}
        </div>
      )}
    </div>
  );
}

const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function TransactionsView({ accountFilter, transactions, accounts, onAdd, onEdit, onDelete }: { accountFilter: ReactNode; transactions: FinanceTransaction[]; accounts: FinanceAccount[]; onAdd: () => void; onEdit: (x: FinanceTransaction) => void; onDelete: (x: FinanceTransaction) => void }) {
  const [filter, setFilter] = usePagePreference('finance.transactions.search','');
  const [kind, setKind] = usePagePreference<'all'|'expense'|'income'>('finance.transactions.kind','all',oneOf('all','expense','income'));
  const [limit, setLimit] = usePagePreference('finance.transactions.limit',80);
  const [period, setPeriod] = usePagePreference('finance.transactions.period','all',oneOf('all','month','year'));
  const q = filter.trim().toLowerCase();
  const list = useMemo(() => transactions
    .filter(t => kind === 'all' || t.type === kind)
    .filter(t => period === 'all' || (period === 'month' ? monthKey(t.date) === monthKeyOf(new Date()) : dateKey(t.date).slice(0,4) === String(new Date().getFullYear())))
    .filter(t => !q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date)), [transactions, kind, q, period]);
  const shown = list.slice(0, limit);
  const groups = useMemo(() => {
    const map = new Map<string, FinanceTransaction[]>();
    shown.forEach(t => { const k = dateKey(t.date); map.set(k, [...(map.get(k) || []), t]); });
    return [...map.entries()];
  }, [shown]);
  const accName = (id: string) => accounts.find(a => a.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <h1 className="sr-only page-title-hidden">Transactions</h1>
      <div className="finance-list-filters dashboard-filter-controls">
        {accountFilter}
        <DashboardFilter label="Mouvement" ariaLabel="Type de transaction" value={kind} onChange={value => { setKind(value as typeof kind); setLimit(80); }} options={[{value:'all',label:'Tous les mouvements'},{value:'expense',label:'Dépenses'},{value:'income',label:'Revenus'}]} />
        <DashboardFilter label="Période" ariaLabel="Période des transactions" value={period} onChange={value=>{setPeriod(value);setLimit(80);}} options={[{value:'all',label:'Tout l’historique'},{value:'month',label:'Ce mois-ci'},{value:'year',label:'Cette année'}]} />
        <div className="finance-search"><label className="dashboard-filter-caption" htmlFor="finance-transaction-search">Recherche</label><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" /><Input id="finance-transaction-search" value={filter} onChange={event=>{setFilter(event.target.value);setLimit(80);}} placeholder="Description ou catégorie…" className="pl-9" /></div></div>
        <Button className="ml-auto h-[42px] gap-2" onClick={onAdd}><Plus className="h-4 w-4" />Ajouter</Button>
      </div>

      <div className="surface overflow-hidden">
        {groups.map(([date, items]) => {
          const net = items.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
          return (
            <div key={date} className="border-t border-border first:border-t-0">
              <div className="flex items-center justify-between px-5 py-2.5 text-xs text-muted-foreground">
                <span className="capitalize font-medium">{dayLabel(date)}</span>
                <span className="font-mono">{net >= 0 ? '+' : ''}{eur(net)}</span>
              </div>
              <div className="px-3 py-1">{items.map(t => <TxRow key={t.id} t={t} accountName={accName(t.accountId)} onEdit={onEdit} onDelete={onDelete} />)}</div>
            </div>
          );
        })}
        {!list.length && <Empty text={transactions.length ? 'Aucune transaction ne correspond à ta recherche.' : 'Aucune transaction pour le moment.'} />}
      </div>
      {list.length > limit && <div className="flex justify-center"><Button variant="outline" className="rounded-full" onClick={() => setLimit(l => l + 80)}>Afficher plus ({list.length - limit} restantes)</Button></div>}
    </div>
  );
}

function formatAccountBalance(account: FinanceAccount) {
  try { return new Intl.NumberFormat('fr-FR', {style:'currency',currency:account.currency || 'EUR'}).format(account.balance); }
  catch { return `${account.balance.toLocaleString('fr-FR', {minimumFractionDigits:2,maximumFractionDigits:2})} ${account.currency}`; }
}

function AccountsView({ accounts, onNew, onEdit, onDelete, onStatements }: { accounts: FinanceAccount[]; onNew: () => void; onEdit: (a: FinanceAccount) => void; onDelete: (a: FinanceAccount) => void; onStatements: (a: FinanceAccount) => void }) {
  const [status,setStatus] = usePagePreference('finance.accounts.status','active',oneOf('all','active','archived'));
  const [type,setType] = usePagePreference('finance.accounts.type','all');
  const [search,setSearch] = usePagePreference('finance.accounts.search','');
  const filtered=accounts.filter(account => (status==='all' || Boolean(account.archived)===(status==='archived')) && (type==='all' || account.type===type) && `${account.name} ${account.institution}`.toLocaleLowerCase('fr-FR').includes(search.toLocaleLowerCase('fr-FR')));
  return <div className="space-y-6">
    <h1 className="sr-only page-title-hidden">Comptes</h1>
    <div className="finance-list-filters dashboard-filter-controls">
      <DashboardFilter label="Statut" ariaLabel="Statut des comptes Finance" value={status} onChange={setStatus} options={[{value:'all',label:'Tous les comptes'},{value:'active',label:'Actifs'},{value:'archived',label:'Archivés'}]} />
      <DashboardFilter label="Type" ariaLabel="Type de compte Finance" value={type} onChange={setType} options={[{value:'all',label:'Tous les types'},...ACCOUNT_TYPES.map(value=>({value,label:value}))]} />
      <div className="finance-search"><label className="dashboard-filter-caption" htmlFor="finance-account-search">Recherche</label><Input id="finance-account-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nom ou établissement…" /></div>
      <Button className="ml-auto gap-2" onClick={onNew}><Plus className="h-4 w-4" />Nouveau compte</Button>
    </div>
    <div className="finance-account-list">
      <div className="finance-account-row finance-list-heading" aria-hidden="true"><span>Compte</span><span>Établissement</span><span>Solde actuel</span><span /></div>
      {filtered.map((account,index)=><div key={account.id} className="finance-account-row">
        <div className="flex min-w-0 items-center gap-3"><span className="h-2 w-2 shrink-0 rounded-full" style={{background:account.color||PALETTE[index%PALETTE.length]}} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{account.name}</p><p className="mt-1 text-xs text-muted-foreground">{account.type}{account.archived ? ' · Archivé' : ''}</p></div></div>
        <span className="text-xs text-muted-foreground">{account.institution || '—'}</span>
        <span className="finance-list-amount">{formatAccountBalance(account)}</span>
        <div className="finance-row-actions"><Button variant="ghost" size="sm" onClick={()=>onStatements(account)}>Voir l’évolution</Button><Button variant="ghost" size="icon" onClick={()=>onEdit(account)} aria-label={`Modifier ${account.name}`}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={()=>onDelete(account)} aria-label={`Supprimer ${account.name}`}><X className="h-4 w-4" /></Button></div>
      </div>)}
      {!filtered.length && <Empty text={accounts.length ? 'Aucun compte ne correspond aux filtres.' : 'Ajoute ton premier compte.'} />}
    </div>
  </div>;
}

function SubscriptionsView({ accountFilter, subscriptions, accounts, onNew, onToggle, onDelete }: { accountFilter: ReactNode; subscriptions: FinanceSubscription[]; accounts: FinanceAccount[]; onNew: () => void; onToggle: (s: FinanceSubscription) => void; onDelete: (s: FinanceSubscription) => void }) {
  const [status,setStatus]=usePagePreference('finance.subscriptions.status','all',oneOf('all','active','inactive'));
  const [search,setSearch]=usePagePreference('finance.subscriptions.search','');
  const list=subscriptions.filter(item=>(status==='all'||item.active===(status==='active')) && item.name.toLocaleLowerCase('fr-FR').includes(search.toLocaleLowerCase('fr-FR')));
  const monthly=list.filter(item=>item.active).reduce((sum,item)=>sum+item.amount*(item.frequency==='yearly'?1/12:item.frequency==='weekly'?52/12:1),0);
  const freq={monthly:'mois',yearly:'an',weekly:'semaine'};
  return <div className="space-y-6">
    <h1 className="sr-only page-title-hidden">Abonnements</h1>
    <div className="finance-list-filters dashboard-filter-controls">{accountFilter}<DashboardFilter label="Statut" ariaLabel="Statut des abonnements" value={status} onChange={setStatus} options={[{value:'all',label:'Tous les abonnements'},{value:'active',label:'Actifs'},{value:'inactive',label:'En pause'}]} /><div className="finance-search"><label className="dashboard-filter-caption" htmlFor="finance-sub-search">Recherche</label><Input id="finance-sub-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Rechercher un abonnement…" /></div><Button className="ml-auto h-[42px] gap-2" onClick={onNew}><Plus className="h-4 w-4" />Ajouter</Button></div><p className="text-xs text-muted-foreground">Budget mensuel <span className="ml-2 text-sm font-semibold tabular-nums text-foreground">{eur(monthly)}</span></p>
    <div>{list.map(item=><div key={item.id} className={`finance-subscription-row ${item.active?'':'opacity-60'}`}>
      <div className="flex min-w-0 items-center gap-3"><CategoryTile category={item.category} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{accounts.find(account=>account.id===item.accountId)?.name || '—'}</p></div></div>
      <div><p className="text-sm font-semibold tabular-nums">{eur(item.amount)} <span className="text-xs font-normal text-muted-foreground">/ {freq[item.frequency]}</span></p><p className="mt-1 text-xs text-muted-foreground">{item.active ? `Prochain : ${new Date(`${item.nextDate}T12:00:00`).toLocaleDateString('fr-FR')}`:'En pause'}</p></div>
      <div className="finance-row-actions"><Button variant="ghost" size="sm" onClick={()=>onToggle(item)}>{item.active?'Mettre en pause':'Réactiver'}</Button><Button variant="ghost" size="icon" onClick={()=>onDelete(item)} aria-label={`Supprimer ${item.name}`}><X className="h-4 w-4" /></Button></div>
    </div>)}{!list.length&&<Empty text="Aucun abonnement pour ces filtres." />}</div>
  </div>;
}

function TransfersView({ accountFilter, transfers, accounts, onNew, onDelete }: { accountFilter: ReactNode; transfers: FinanceTransfer[]; accounts: FinanceAccount[]; onNew: () => void; onDelete: (t: FinanceTransfer) => void }) {
  const [kind,setKind]=usePagePreference('finance.transfers.kind','all',oneOf('all','once','recurring'));
  const name=(id:string)=>accounts.find(account=>account.id===id)?.name||'—';
  const frequency={monthly:'Mensuel',weekly:'Hebdomadaire',yearly:'Annuel'};
  const list=[...transfers].filter(item=>kind==='all'||item.recurring===(kind==='recurring')).sort((a,b)=>b.date.localeCompare(a.date));
  return <div className="space-y-6">
    <h1 className="sr-only page-title-hidden">Virements</h1>
    <div className="dashboard-filter-controls">{accountFilter}<DashboardFilter label="Fréquence" ariaLabel="Type de virement" value={kind} onChange={setKind} options={[{value:'all',label:'Tous les virements'},{value:'once',label:'Ponctuels'},{value:'recurring',label:'Récurrents'}]} /><Button className="ml-auto h-[42px] gap-2" onClick={onNew}><Plus className="h-4 w-4" />Nouveau virement</Button></div>
    <div>{list.map(item=><div key={item.id} className="finance-transfer-row">
      <div className="min-w-0"><p className="text-sm font-medium">{name(item.fromAccountId)} <span className="mx-2 text-muted-foreground">→</span> {name(item.toAccountId)}</p><p className="mt-1.5 text-xs text-muted-foreground">{new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR')}{item.recurring ? ` · ${frequency[item.frequency||'monthly']}`:''}</p></div>
      <span className="finance-list-amount">{eur(item.amount)}</span><Button variant="ghost" size="icon" onClick={()=>onDelete(item)} aria-label="Supprimer le virement"><X className="h-4 w-4" /></Button>
    </div>)}{!list.length&&<Empty text="Aucun virement pour ces filtres." />}</div>
  </div>;
}
