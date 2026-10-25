import { useMemo, useState } from 'react';
import { LogoSwitch } from '@/components/trading/LogoSwitch';
import { HEADER_BAR, HEADER_GRID, NAV_PILL, navItemClass } from '@/components/trading/navStyles';
import { StatementsView, type FinanceStatement } from '@/components/finance/StatementsView';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowDownLeft, ArrowRightLeft, ArrowUpRight, CalendarClock, ChevronLeft, ChevronRight,
  Landmark, Pencil, Plus, Repeat2, Save, Search, Settings2, TrendingUp, X, PiggyBank,
} from 'lucide-react';
import { YearFlowBars, CashflowChart, FlowAreaChart, Donut, AccountBars, PALETTE } from '@/components/finance/financeCharts';
import { Card, CategoryTile, DeltaPill, Empty, Segmented, SectionHeader, SplitBar, Stat, Tile, eur } from '@/components/finance/ui';
import { toast } from 'sonner';

interface FinanceAccount { id: string; name: string; type: string; institution: string; balance: number; openingBalance?: number; currency: string; color?: string; archived?: boolean; initialCapital?: number | null; initialDate?: string | null; }
interface FinanceTransaction { id: string; date: string; description: string; amount: number; type: 'income' | 'expense'; accountId: string; category: string; notes?: string; }
interface FinanceSubscription { id: string; name: string; amount: number; frequency: 'monthly' | 'yearly' | 'weekly'; nextDate: string; accountId: string; category: string; active: boolean; }
interface FinanceTransfer { id: string; date: string; fromAccountId: string; toAccountId: string; amount: number; recurring: boolean; frequency?: 'monthly' | 'weekly' | 'yearly'; nextDate?: string; active: boolean; }

type Tab = 'overview' | 'transactions' | 'accounts' | 'subscriptions' | 'transfers';

const ACCOUNT_TYPES = ['Compte courant', 'Épargne', 'Assurance-vie', 'PEA', 'CTO', 'Crypto', 'Espèces', 'Autre'];
const EXPENSE_CATEGORIES = ['Logement', 'Alimentation', 'Transport', 'Abonnements', 'Loisirs', 'Shopping', 'Santé', 'Formation', 'Trading', 'Famille', 'Impôts', 'Autre'];
const INCOME_CATEGORIES = ['Salaire', 'Trading', 'Payout', 'Intérêts', 'Vente', 'Autre'];
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

  const TABS: [Tab, string][] = [['overview', 'Vue d’ensemble'], ['transactions', 'Transactions'], ['accounts', 'Comptes'], ['subscriptions', 'Abonnements'], ['transfers', 'Virements']];
  const openNewTx = () => { setTx({ ...emptyTx, accountId: accounts[0]?.id || '' }); setTxOpen(true); };
  const prev = () => setCursor(new Date(cursor.getFullYear() + (overviewMode === 'year' ? -1 : 0), cursor.getMonth() + (overviewMode === 'month' ? -1 : 0), 1));
  const next = () => setCursor(new Date(cursor.getFullYear() + (overviewMode === 'year' ? 1 : 0), cursor.getMonth() + (overviewMode === 'month' ? 1 : 0), 1));
  const otherBalance = balance - cashBalance - investmentBalance;
  const recentTx = [...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const topCategories = categoryData.slice(0, 6);
  const expenseTotal = categoryData.reduce((s, c) => s + c.value, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Barre du haut : logo | menu CENTRÉ | colonne symétrique (aucun élément ne peut se superposer au menu) */}
      <header className={HEADER_BAR}>
        <div className={HEADER_GRID}>
          <LogoSwitch className="pointer-events-auto h-[56px] w-[56px] shrink-0" />
          <div className="flex justify-center min-w-0">
            <nav className={NAV_PILL} aria-label="Navigation My Finance">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
                {TABS.map(([value, label]) => (
                  <button key={value} onClick={() => setTab(value)} aria-current={tab === value ? 'page' : undefined} className={navItemClass(tab === value)}>{label}</button>
                ))}
              </div>
            </nav>
          </div>
          <div aria-hidden />
        </div>
      </header>

      {/* Barre d'outils descendue sous le menu : période à gauche, actions à droite */}
      <div className="max-w-[1500px] mx-auto px-4 md:px-6 pt-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-h-10">
          {tab === 'overview' && <>
            <div className="inline-flex items-center gap-1">
              <button onClick={prev} aria-label="Période précédente" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              <h1 className="text-lg font-semibold capitalize min-w-[150px] text-center">{overviewMode === 'month' ? monthLabel : cursor.getFullYear()}</h1>
              <button onClick={next} aria-label="Période suivante" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <Segmented<'month' | 'year'> value={overviewMode} onChange={setOverviewMode} options={[['month', 'Mois'], ['year', 'Année']]} />
          </>}
          {tab === 'accounts' && (
            <Segmented<'list' | 'statements'> value={accountsView} onChange={(v) => { if (v === 'statements') setStatementsAccountId(undefined); setAccountsView(v); }} options={[['list', 'Mes comptes'], ['statements', 'Relevés & évolution']]} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-10 rounded-full gap-1.5 px-4" onClick={() => setTab('accounts')}><Landmark className="h-4 w-4" />{accounts.length} {accounts.length > 1 ? 'comptes' : 'compte'}</Button>
          <Button size="sm" className="h-10 rounded-full gap-1.5 px-4" onClick={openNewTx}><Plus className="h-4 w-4" />Transaction</Button>
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto px-4 md:px-6 pb-10 pt-5 space-y-4">
        {tab === 'overview' && overviewMode === 'year' && <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Revenus annuels" value={eur(yearTotals.income)} icon={<ArrowDownLeft className="h-4 w-4" />} color="hsl(var(--profit))" />
            <Stat label="Dépenses annuelles" value={eur(yearTotals.expenses)} icon={<ArrowUpRight className="h-4 w-4" />} color="hsl(var(--loss))" />
            <Stat label="Cash-flow annuel" value={eur(yearTotals.cashflow)} icon={<TrendingUp className="h-4 w-4" />} color={yearTotals.cashflow >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'} />
            <Stat label="Taux d’épargne annuel" value={`${yearSavingsRate.toFixed(1)} %`} icon={<PiggyBank className="h-4 w-4" />} color={PALETTE[0]} />
          </div>
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
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
          <div className="grid lg:grid-cols-[1.65fr_1fr] gap-4">
            {/* Héro : patrimoine, variation du mois, courbe, répartition */}
            <section className="surface p-6 flex flex-col">
              <p className="text-[13px] text-muted-foreground">Patrimoine suivi</p>
              <p className="font-mono text-[40px] leading-[1.1] font-semibold tracking-tight mt-1">{eur(balance)}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <DeltaPill value={income - expenses} label={`${income - expenses >= 0 ? '+' : ''}${eur(income - expenses)}`} />
                <span className="text-[13px] text-muted-foreground">cash-flow de <span className="capitalize">{monthLabel}</span></span>
              </div>
              <div className="h-[220px] mt-5 -mx-2"><FlowAreaChart data={trendData} lastIndex={trendData.length - 1} /></div>
              <div className="mt-5 pt-5 border-t border-border">
                {balance > 0 || cashBalance > 0 || investmentBalance > 0 ? (
                  <SplitBar parts={[
                    { label: 'Liquidités', value: cashBalance, color: PALETTE[4] },
                    { label: 'Investissements', value: investmentBalance, color: PALETTE[0] },
                    ...(Math.abs(otherBalance) > 0.5 ? [{ label: 'Autres', value: otherBalance, color: PALETTE[7] }] : []),
                  ]} />
                ) : <p className="text-sm text-muted-foreground">Ajoute un compte pour voir la répartition de ton patrimoine.</p>}
              </div>
            </section>

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

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Revenus du mois" value={eur(income)} icon={<ArrowDownLeft className="h-4 w-4" />} color="hsl(var(--profit))" hint={`${monthTx.filter(t => t.type === 'income').length} opération(s)`} />
            <Stat label="Dépenses du mois" value={eur(expenses)} icon={<ArrowUpRight className="h-4 w-4" />} color="hsl(var(--loss))" hint={`${monthTx.filter(t => t.type === 'expense').length} opération(s)`} />
            <Stat label="Épargne du mois" value={eur(Math.max(0, income - expenses))} icon={<PiggyBank className="h-4 w-4" />} color={PALETTE[1]}>
              <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%`, background: PALETTE[1] }} /></div>
              <p className="text-xs text-muted-foreground mt-2">Taux d’épargne : <span className="font-mono font-semibold text-foreground">{savingsRate.toFixed(1)} %</span></p>
            </Stat>
            <Stat label="Dépenses fixes" value={eur(fixedMonthly)} icon={<CalendarClock className="h-4 w-4" />} color={PALETTE[2]} hint={`par mois · ${subscriptions.filter(s => s.active).length} abonnement(s) actif(s)`} />
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
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

        {tab === 'transactions' && <TransactionsView transactions={transactions} accounts={accounts} onAdd={openNewTx} onEdit={(x) => { setTx(x); setTxOpen(true); }} onDelete={async (x) => { await deleteRow('financeTransactions' as any, x.id); toast.success('Transaction supprimée'); }} />}
        {tab === 'accounts' && accountsView === 'list' && <AccountsView onStatements={(a) => { setStatementsAccountId(a.id); setAccountsView('statements'); }} accounts={accounts.map(a => ({ ...a, balance: accountBalances[a.id] ?? Number(a.balance || 0) }))} onNew={() => { setEditingAccount(null); setAccountForm({ id: '', name: '', type: 'Compte courant', institution: '', balance: 0, currency: 'EUR' }); setAccountOpen(true); }} onEdit={(a) => { const original = accounts.find(x => x.id === a.id) || a; setEditingAccount(original); setAccountForm(a); setAccountOpen(true); }} onDelete={async a => { await deleteRow('financeAccounts' as any, a.id); toast.success('Compte supprimé'); }} />}
        {tab === 'accounts' && accountsView === 'statements' && <StatementsView key={statementsAccountId || 'all'} accounts={accounts} statements={statements} initialAccountId={statementsAccountId} onSave={saveStatement} onDelete={deleteStatement} onSetInitial={setInitialCapital} />}
        {tab === 'subscriptions' && <SubscriptionsView subscriptions={subscriptions} accounts={accounts} onNew={() => { setSubForm({ ...subForm, id: '', name: '', amount: 0, accountId: accounts[0]?.id || '' }); setSubOpen(true); }} onToggle={async s => await updateRow('financeSubscriptions' as any, s.id, { active: !s.active })} onDelete={async s => { await deleteRow('financeSubscriptions' as any, s.id); toast.success('Abonnement supprimé'); }} />}
        {tab === 'transfers' && <TransfersView transfers={transfers} accounts={accounts} onNew={() => { setTransferForm({ ...transferForm, id: '', fromAccountId: accounts[0]?.id || '', toAccountId: accounts[1]?.id || '' }); setTransferOpen(true); }} onDelete={async t => { await deleteRow('financeTransfers' as any, t.id); toast.success('Virement supprimé'); }} />}
      </main>

      <Dialog open={txOpen} onOpenChange={setTxOpen}><DialogContent className="bg-card border-border sm:max-w-lg rounded-2xl"><DialogHeader><DialogTitle>Nouvelle transaction</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-2"><button onClick={()=>setTx(x=>({...x,type:'expense',category:'Autre'}))} className={`p-3 rounded-xl border text-sm ${tx.type==='expense'?'border-loss/40 bg-loss-soft text-loss font-medium':'border-border'}`}>Dépense</button><button onClick={()=>setTx(x=>({...x,type:'income',category:'Autre'}))} className={`p-3 rounded-xl border text-sm ${tx.type==='income'?'border-profit/40 bg-profit-soft text-profit font-medium':'border-border'}`}>Revenu</button></div><div className="grid grid-cols-2 gap-3"><div><Label>Date</Label><Input type="date" value={tx.date} onChange={e=>setTx(x=>({...x,date:e.target.value}))}/></div><div><Label>Montant</Label><Input type="number" step="0.01" value={tx.amount||''} onChange={e=>setTx(x=>({...x,amount:Number(e.target.value)}))}/></div></div><div><Label>Description</Label><Input value={tx.description} onChange={e=>setTx(x=>({...x,description:e.target.value}))} placeholder="Courses, salaire, abonnement…"/></div><div className="grid grid-cols-2 gap-3"><div><Label>Compte</Label><Select value={tx.accountId} onValueChange={v=>setTx(x=>({...x,accountId:v}))}><SelectTrigger><SelectValue placeholder="Compte"/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Catégorie</Label><Select value={tx.category} onValueChange={v=>setTx(x=>({...x,category:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{(tx.type==='expense'?EXPENSE_CATEGORIES:INCOME_CATEGORIES).map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Note</Label><Input value={tx.notes||''} onChange={e=>setTx(x=>({...x,notes:e.target.value}))}/></div><Button onClick={saveTx} className="w-full"><Save className="h-4 w-4 mr-2"/>Enregistrer</Button></div></DialogContent></Dialog>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}><DialogContent className="bg-card border-border sm:max-w-lg rounded-2xl"><DialogHeader><DialogTitle>{editingAccount?'Modifier le compte':'Nouveau compte'}</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label>Nom</Label><Input value={accountForm.name} onChange={e=>setAccountForm(x=>({...x,name:e.target.value}))} placeholder="Compte courant"/></div><div><Label>Banque / établissement</Label><Input value={accountForm.institution} onChange={e=>setAccountForm(x=>({...x,institution:e.target.value}))} placeholder="Boursobank, Fortuneo…"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><Select value={accountForm.type} onValueChange={v=>setAccountForm(x=>({...x,type:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ACCOUNT_TYPES.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Solde actuel</Label><Input type="number" step="0.01" value={accountForm.balance||''} onChange={e=>setAccountForm(x=>({...x,balance:Number(e.target.value)}))}/></div></div><div><Label>Devise</Label><Input value={accountForm.currency} onChange={e=>setAccountForm(x=>({...x,currency:e.target.value.toUpperCase()}))}/></div><Button onClick={saveAccount} className="w-full">Enregistrer</Button></div></DialogContent></Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}><DialogContent className="bg-card border-border sm:max-w-lg rounded-2xl"><DialogHeader><DialogTitle>Nouvel abonnement</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label>Nom</Label><Input value={subForm.name} onChange={e=>setSubForm(x=>({...x,name:e.target.value}))} placeholder="Netflix, salle, téléphone…"/></div><div><Label>Montant</Label><Input type="number" step="0.01" value={subForm.amount||''} onChange={e=>setSubForm(x=>({...x,amount:Number(e.target.value)}))}/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Fréquence</Label><Select value={subForm.frequency} onValueChange={(v:any)=>setSubForm(x=>({...x,frequency:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuel</SelectItem><SelectItem value="yearly">Annuel</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem></SelectContent></Select></div><div><Label>Prochain prélèvement</Label><Input type="date" value={subForm.nextDate} onChange={e=>setSubForm(x=>({...x,nextDate:e.target.value}))}/></div></div><div><Label>Compte débité</Label><Select value={subForm.accountId} onValueChange={v=>setSubForm(x=>({...x,accountId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><Button onClick={saveSub} className="w-full">Enregistrer</Button></div></DialogContent></Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}><DialogContent className="bg-card border-border sm:max-w-lg rounded-2xl"><DialogHeader><DialogTitle>Virement automatique / ponctuel</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label>Compte source</Label><Select value={transferForm.fromAccountId} onValueChange={v=>setTransferForm(x=>({...x,fromAccountId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Compte destination</Label><Select value={transferForm.toAccountId} onValueChange={v=>setTransferForm(x=>({...x,toAccountId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Montant</Label><Input type="number" step="0.01" value={transferForm.amount||''} onChange={e=>setTransferForm(x=>({...x,amount:Number(e.target.value)}))}/></div><div><Label>Date</Label><Input type="date" value={transferForm.date} onChange={e=>setTransferForm(x=>({...x,date:e.target.value}))}/></div></div><div className="flex items-center gap-2 p-3 rounded-xl border border-border"><Checkbox checked={transferForm.recurring} onCheckedChange={v=>setTransferForm(x=>({...x,recurring:Boolean(v)}))}/><div><p className="text-xs font-medium">Virement récurrent</p><p className="text-[10px] text-muted-foreground">Suivi d’un virement automatique vers ton épargne / investissement.</p></div></div>{transferForm.recurring&&<div className="grid grid-cols-2 gap-3"><div><Label>Fréquence</Label><Select value={transferForm.frequency} onValueChange={(v:any)=>setTransferForm(x=>({...x,frequency:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuel</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem><SelectItem value="yearly">Annuel</SelectItem></SelectContent></Select></div><div><Label>Prochaine date</Label><Input type="date" value={transferForm.nextDate} onChange={e=>setTransferForm(x=>({...x,nextDate:e.target.value}))}/></div></div>}<Button onClick={saveTransfer} className="w-full">Enregistrer</Button></div></DialogContent></Dialog>
    </div>
  );
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
        <div className="flex items-center gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onEdit && <button onClick={() => onEdit(t)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Modifier"><Pencil className="h-3.5 w-3.5" /></button>}
          {onDelete && <button onClick={() => onDelete(t)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-loss hover:bg-loss-soft transition-colors" aria-label="Supprimer"><X className="h-3.5 w-3.5" /></button>}
        </div>
      )}
    </div>
  );
}

const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function TransactionsView({ transactions, accounts, onAdd, onEdit, onDelete }: { transactions: FinanceTransaction[]; accounts: FinanceAccount[]; onAdd: () => void; onEdit: (x: FinanceTransaction) => void; onDelete: (x: FinanceTransaction) => void }) {
  const [filter, setFilter] = useState('');
  const [kind, setKind] = useState<'all' | 'expense' | 'income'>('all');
  const [limit, setLimit] = useState(80);
  const q = filter.trim().toLowerCase();
  const list = useMemo(() => transactions
    .filter(t => kind === 'all' || t.type === kind)
    .filter(t => !q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date)), [transactions, kind, q]);
  const income = list.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = list.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const shown = list.slice(0, limit);
  const groups = useMemo(() => {
    const map = new Map<string, FinanceTransaction[]>();
    shown.forEach(t => { const k = dateKey(t.date); map.set(k, [...(map.get(k) || []), t]); });
    return [...map.entries()];
  }, [shown]);
  const accName = (id: string) => accounts.find(a => a.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <SectionHeader title="Transactions" subtitle={`${transactions.length} opérations enregistrées · soldes mis à jour en temps réel`} action={<Button size="sm" className="rounded-full h-10 px-4" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-[320px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={filter} onChange={e => { setFilter(e.target.value); setLimit(80); }} placeholder="Rechercher une transaction…" className="h-10 pl-10 rounded-full bg-card" />
        </div>
        <Segmented<'all' | 'expense' | 'income'> value={kind} onChange={(v) => { setKind(v); setLimit(80); }} options={[['all', 'Tout'], ['expense', 'Dépenses'], ['income', 'Revenus']]} />
        <div className="ml-auto flex items-center gap-4 text-[13px]">
          <span className="text-muted-foreground">Revenus <span className="font-mono font-semibold text-profit">{eur(income)}</span></span>
          <span className="text-muted-foreground">Dépenses <span className="font-mono font-semibold text-foreground">{eur(expenses)}</span></span>
        </div>
      </div>

      <div className="surface overflow-hidden">
        {groups.map(([date, items]) => {
          const net = items.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
          return (
            <div key={date} className="border-t border-border first:border-t-0">
              <div className="flex items-center justify-between px-5 py-2.5 bg-secondary/60 text-xs text-muted-foreground">
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

function AccountsView({ accounts, onNew, onEdit, onDelete, onStatements }: { accounts: FinanceAccount[]; onNew: () => void; onEdit: (a: FinanceAccount) => void; onDelete: (a: FinanceAccount) => void; onStatements: (a: FinanceAccount) => void }) {
  const total = accounts.filter(a => !a.archived).reduce((s, a) => s + a.balance, 0);
  return (
    <div className="space-y-4">
      <SectionHeader title="Comptes & patrimoine" subtitle={`${eur(total)} au total · tous tes comptes au même endroit`} action={<Button size="sm" className="rounded-full h-10 px-4" onClick={onNew}><Plus className="h-4 w-4 mr-1" />Nouveau compte</Button>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((a, i) => {
          const color = a.color || PALETTE[i % PALETTE.length];
          return (
            <div key={a.id} className="surface p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Tile color={color} size="lg"><Landmark className="h-5 w-5" /></Tile>
                  <div className="min-w-0"><p className="font-semibold text-[15px] truncate">{a.name}</p><p className="text-xs text-muted-foreground truncate">{a.type} · {a.institution || '—'}</p></div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" onClick={() => onEdit(a)} aria-label="Modifier"><Settings2 className="h-4 w-4" /></button>
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-loss hover:bg-loss-soft transition-colors" onClick={() => onDelete(a)} aria-label="Supprimer"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="font-mono text-[28px] leading-none font-semibold tracking-tight mt-6">{eur(a.balance)}</p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">{a.currency}</p>
                <button className="text-[13px] font-medium text-primary hover:underline" onClick={() => onStatements(a)}>Relevés & évolution</button>
              </div>
            </div>
          );
        })}
        {!accounts.length && <div className="md:col-span-2 xl:col-span-3 surface"><Empty text="Crée ton premier compte bancaire, épargne ou investissement." /></div>}
      </div>
    </div>
  );
}

function SubscriptionsView({ subscriptions, accounts, onNew, onToggle, onDelete }: { subscriptions: FinanceSubscription[]; accounts: FinanceAccount[]; onNew: () => void; onToggle: (s: FinanceSubscription) => void; onDelete: (s: FinanceSubscription) => void }) {
  const monthly = subscriptions.filter(s => s.active).reduce((s, x) => s + (x.frequency === 'monthly' ? x.amount : x.frequency === 'yearly' ? x.amount / 12 : x.amount * 52 / 12), 0);
  const freq = { monthly: 'par mois', yearly: 'par an', weekly: 'par semaine' } as const;
  return (
    <div className="space-y-4">
      <SectionHeader title="Abonnements" subtitle={`${eur(monthly)} / mois estimés · ${subscriptions.filter(x => x.active).length} actif(s)`} action={<Button size="sm" className="rounded-full h-10 px-4" onClick={onNew}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {subscriptions.map(s => (
          <div key={s.id} className={`surface p-5 transition-opacity ${s.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-3">
              <CategoryTile category={s.category} size="lg" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-[15px] truncate">{s.name}</p><p className="text-xs text-muted-foreground truncate">{s.category} · {accounts.find(a => a.id === s.accountId)?.name || '—'}</p></div>
            </div>
            <p className="font-mono text-[26px] leading-none font-semibold tracking-tight mt-5">{eur(s.amount)} <span className="text-xs font-normal text-muted-foreground font-sans">{freq[s.frequency]}</span></p>
            <div className="flex items-center justify-between mt-4 text-xs">
              <span className="text-muted-foreground">Prochain : {s.nextDate}</span>
              <div className="flex gap-3 font-medium">
                <button onClick={() => onToggle(s)} className="text-primary hover:underline">{s.active ? 'Désactiver' : 'Réactiver'}</button>
                <button onClick={() => onDelete(s)} className="text-loss hover:underline">Supprimer</button>
              </div>
            </div>
          </div>
        ))}
        {!subscriptions.length && <div className="md:col-span-2 xl:col-span-3 surface"><Empty text="Aucun abonnement suivi pour le moment." /></div>}
      </div>
    </div>
  );
}

function TransfersView({ transfers, accounts, onNew, onDelete }: { transfers: FinanceTransfer[]; accounts: FinanceAccount[]; onNew: () => void; onDelete: (t: FinanceTransfer) => void }) {
  const name = (id: string) => accounts.find(a => a.id === id)?.name || '—';
  return (
    <div className="space-y-4">
      <SectionHeader title="Virements" subtitle="Transferts ponctuels et virements automatiques à suivre" action={<Button size="sm" className="rounded-full h-10 px-4" onClick={onNew}><Plus className="h-4 w-4 mr-1" />Nouveau virement</Button>} />
      <div className="surface px-3 py-1">
        {transfers.map(t => (
          <div key={t.id} className="group flex items-center gap-3 px-2 py-3 border-t border-border first:border-t-0">
            <Tile color={PALETTE[0]}><ArrowRightLeft className="h-[18px] w-[18px]" /></Tile>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate">{name(t.fromAccountId)} <span className="text-muted-foreground">→</span> {name(t.toAccountId)}</p>
              <p className="text-xs text-muted-foreground">{t.date}{t.recurring ? ` · ${t.frequency} · prochain ${t.nextDate}` : ''}</p>
            </div>
            <span className="font-mono text-[13px] font-semibold">{eur(t.amount)}</span>
            <button onClick={() => onDelete(t)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-loss hover:bg-loss-soft transition-colors" aria-label="Supprimer"><X className="h-4 w-4" /></button>
          </div>
        ))}
        {!transfers.length && <Empty text="Aucun virement enregistré." />}
      </div>
    </div>
  );
}
