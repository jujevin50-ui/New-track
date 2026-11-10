import MonthlyPerformanceChart from '@/components/trading/MonthlyPerformanceChart';
import DashboardFilter from '@/components/trading/DashboardFilter';
import { ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, XAxis, YAxis, Tooltip } from 'recharts';
import DisciplineYearChart from '@/components/trading/DisciplineYearChart';
import { chartTooltipMotion } from '@/lib/chartMotion';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTrades } from '@/hooks/useTrades';
import { useDailyJournal } from '@/hooks/useDailyJournal';
import { localDay, shiftDay } from '@/lib/discipline';
import { buildDashboardCurrencyGroups, dashboardAnalytics } from '@/lib/dashboardAnalytics';
import { getNetResult } from '@/types/trade';
import type { Account } from '@/types/account';
import { Input } from '@/components/ui/input';
import DashboardPerformanceChart from '@/components/trading/DashboardPerformanceChart';

interface DashboardProps { activeAccount: Account | null; accounts: Account[]; onSelectAccount?: (id: string) => void; }
type View = 'account' | 'global';
type Period = 'all' | '30' | '90' | 'year' | 'custom';
const pct = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
const tone = (value: number) => value > 0 ? 'text-profit' : value < 0 ? 'text-loss' : 'text-foreground';
const dateLabel = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function money(value: number, currency: string, signed = false) {
  const signDisplay = signed ? 'exceptZero' : 'auto';
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2, signDisplay }).format(value); }
  catch { return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay })} ${currency === 'UNKNOWN' ? '(devise inconnue)' : currency}`; }
}
const ratio = (value: number | null) => value === null ? '—' : value === Infinity ? '∞' : value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`dashboard-section ${className}`}><header className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold tracking-tight">{title}</h2>{action}</header>{children}</section>;
}
function Detail({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`text-right text-sm font-medium tabular-nums ${className}`}>{value}</dd></div>;
}

export default function Dashboard({ activeAccount, accounts, onSelectAccount }: DashboardProps) {
  const navigate = useNavigate();
  const { allTrades } = useTrades(activeAccount?.id ?? null, activeAccount?.initialBalance ?? 0);
  const { journals } = useDailyJournal();
  const [view, setView] = useState<View>(() => localStorage.getItem('dashboard-view') === 'global' ? 'global' : 'account');
  const [period, setPeriod] = useState<Period>('all');
  const [custom, setCustom] = useState({ from: '', to: localDay() });
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [preferredCurrency, setCurrency] = useState('');
  const [unit, setUnit] = useState<'amount' | 'percent'>('amount');
  const today = localDay();
  const filteredAccounts = status === 'all' ? accounts : accounts.filter(account => account.status === status);
  const selectedAccount = filteredAccounts.find(account => account.id === activeAccount?.id) ?? filteredAccounts[0];
  const categories = [...new Set(accounts.map(account => account.category).filter(Boolean))];
  const eligibleAccounts = view === 'account' ? activeAccount?.id === 'all' ? filteredAccounts : selectedAccount ? [selectedAccount] : [] : category === 'all' ? filteredAccounts : filteredAccounts.filter(account => account.category === category);
  const groups = buildDashboardCurrencyGroups(eligibleAccounts);
  const group = groups.find(item => item.currency === preferredCurrency) ?? groups.find(item => item.currency === selectedAccount?.currency?.trim().toUpperCase()) ?? groups[0];
  const currency = group?.currency ?? 'EUR';
  const ambiguousCurrency = currency === 'UNKNOWN' && (group?.accounts.length ?? 0) > 1;
  const scopeAccounts = ambiguousCurrency ? [] : group?.accounts ?? [];
  const capital = ambiguousCurrency ? 0 : group?.startingCapital ?? 0;
  const range = period === 'custom' ? { from: custom.from, to: custom.to && custom.to < today ? custom.to : today } : period === 'year' ? { from: `${today.slice(0, 4)}-01-01`, to: today } : period === 'all' ? { from: '', to: today } : { from: shiftDay(today, -(Number(period) - 1)), to: today };
  const invalidRange = Boolean(range.from && range.to && range.from > range.to);
  const stats = dashboardAnalytics(allTrades, { accountIds: scopeAccounts.map(account => account.id), from: range.from, to: range.to, startingCapital: capital });
  const switchView = (next: View) => { setView(next); localStorage.setItem('dashboard-view', next); };
  const instruments = [...stats.closedTrades.reduce((map, trade) => { const entry = map.get(trade.pair) ?? { name: trade.pair, net: 0, trades: 0 }; entry.net += getNetResult(trade); entry.trades++; map.set(trade.pair, entry); return map; }, new Map<string, { name: string; net: number; trades: number }>()).values()].map(item => ({ ...item, percent: capital > 0 ? item.net / capital * 100 : null })).sort((a, b) => b.net - a.net);
  const qualities = stats.closedTrades.map(trade => trade.setupQuality).filter(value => Number.isFinite(value) && value >= 1 && value <= 3);
  const quality = qualities.length ? qualities.reduce((sum, value) => sum + value, 0) / qualities.length : null;
  const outsidePlan = stats.closedTrades.filter(trade => !trade.strategyRespected);
  const days = stats.daily.slice(-14);
  const positiveDays = stats.daily.filter(item => item.net > 0).length;
  const percentageAvailable = capital > 0;
  const chartUnit = view === 'global' ? 'percent' : percentageAvailable ? unit : 'amount';
  const [disciplineDate, setDisciplineDate] = useState(today);
  const monthly = stats.monthly.map(month => ({ ...month, performance: capital > 0 ? month.net / capital * 100 : null }));

  return <div className="dashboard-redesign mx-auto w-full space-y-8 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{view === 'global' ? 'Vue globale' : activeAccount?.id === 'all' ? 'Tous les comptes' : selectedAccount?.name ?? 'Ton tableau de bord'}</h1><p className="mt-2 text-xs text-muted-foreground">{view === 'global' ? `${scopeAccounts.length} compte${scopeAccounts.length > 1 ? 's' : ''} dans ce périmètre` : activeAccount?.id === 'all' ? `${scopeAccounts.length} comptes dans ce périmètre` : selectedAccount ? [selectedAccount.broker, selectedAccount.category].filter(Boolean).join(' · ') : 'Commence par ajouter ton premier compte.'}</p></div>
      <div className="dashboard-switch" role="group" aria-label="Vue du dashboard"><button type="button" aria-pressed={view === 'account'} onClick={() => switchView('account')}>Compte</button><button type="button" aria-pressed={view === 'global'} onClick={() => switchView('global')}>Global</button></div>
    </header>
    <div className="dashboard-filters">
      <div className="dashboard-filter-controls">
        <DashboardFilter label="Statut" ariaLabel="Statut des comptes" value={status} onChange={value => { setStatus(value); const matching = accounts.filter(account => value === 'all' || account.status === value); if (matching.length && activeAccount?.id !== 'all' && !matching.some(account => account.id === activeAccount?.id)) onSelectAccount?.(matching[0].id); }} options={[{value:'all', label:'Tous les comptes'}, {value:'active', label:'Actifs'}, {value:'pending', label:'En attente'}, {value:'terminated', label:'Terminés'}, {value:'paid_out', label:'Payout effectué'}]} />
        {view === 'account' ? <DashboardFilter label="Compte" ariaLabel="Compte du dashboard" value={activeAccount?.id === 'all' ? 'all' : selectedAccount?.id ?? ''} onChange={id => onSelectAccount?.(id)} disabled={!filteredAccounts.length} options={[{value:'all',label:'Tous les comptes'},...filteredAccounts.map(account => ({value: account.id, label: account.name}))]} /> : <DashboardFilter label="Famille" ariaLabel="Catégorie des comptes" value={category} onChange={setCategory} options={[{value: 'all', label: 'Toutes les familles'}, ...categories.map(item => ({value:item, label:item}))]} />}
        {groups.length > 1 && <DashboardFilter label="Devise" ariaLabel="Devise des résultats" value={currency} onChange={setCurrency} options={groups.map(item => ({value:item.currency, label:item.currency}))} />}
        <DashboardFilter label="Période" ariaLabel="Période du dashboard" value={period} onChange={value => setPeriod(value as Period)} options={[{value:'all', label:'Tout l’historique'}, {value:'30', label:'30 derniers jours'}, {value:'90', label:'90 derniers jours'}, {value:'year', label:'Cette année'}, {value:'custom', label:'Personnalisée'}]} />
      </div>
      <p className="text-[10px] text-muted-foreground">Résultats clôturés · {currency === 'UNKNOWN' ? 'Devise non renseignée' : currency}</p>
      {period === 'custom' && <div className="flex w-full flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-muted-foreground">Du<Input aria-label="Début de la période" type="date" value={custom.from} onChange={event => setCustom(previous => ({ ...previous, from: event.target.value }))} className="h-8 w-auto" /></label><label className="flex items-center gap-2 text-xs text-muted-foreground">Au<Input aria-label="Fin de la période" type="date" value={custom.to} max={today} onChange={event => setCustom(previous => ({ ...previous, to: event.target.value }))} className="h-8 w-auto" /></label>{invalidRange && <p role="alert" className="text-xs text-loss">La fin doit être postérieure au début.</p>}</div>}
    </div>
    {!scopeAccounts.length ? <div className="py-16 text-center"><p className="mb-4 text-sm text-muted-foreground">{ambiguousCurrency ? 'Renseigne la devise de ces comptes pour comparer leurs résultats.' : accounts.length ? 'Aucun compte dans cette sélection.' : 'Ajoute un compte pour commencer à suivre ta progression.'}</p><Link to="/accounts" className="dashboard-text-link">{accounts.length ? 'Gérer mes comptes' : 'Ajouter mon premier compte'} →</Link></div> : <>
    <div className="dashboard-metrics grid grid-cols-2 gap-x-5 gap-y-6 md:grid-cols-3 xl:grid-cols-5">
      {[
        {label: 'Résultat net réalisé', value: money(stats.netProfit, currency, true), color: tone(stats.netProfit)},
        {label: 'Espérance par trade', value: stats.expectancy === null ? '—' : money(stats.expectancy, currency, true)},
        {label: 'Profit factor', value: ratio(stats.profitFactor)},
        {label: 'Win rate', value: pct(stats.winRate), gauge: true, percent: stats.winRate},
        {label: 'Stratégie respectée', value: pct(stats.strategyRate), gauge: true, percent: stats.strategyRate},
      ].map(metric => <div key={metric.label} className="min-w-0 text-center">
        <p className="text-xs text-muted-foreground">{metric.label}</p>
        <div className="dashboard-metric-body">
          {metric.gauge && <svg viewBox="0 0 120 70" className="dashboard-metric-gauge" role="img" aria-label={`${metric.label} : ${metric.value}`}>
            <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="hsl(var(--secondary))" strokeWidth="9" strokeLinecap="round" />
            <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${metric.percent ?? 0} 100`} visibility={metric.percent && metric.percent > 0 ? 'visible' : 'hidden'} />
          </svg>}
          <p className={`dashboard-metric-value ${metric.color ?? ''}`}>{metric.value}</p>
        </div>
      </div>)}
    </div>
    <div className="space-y-8">
      <Section title="Progression du résultat" action={view === 'account' && <div className="dashboard-switch dashboard-switch-small" role="group" aria-label="Unité de la courbe"><button type="button" aria-pressed={chartUnit === 'amount'} onClick={() => setUnit('amount')}>{currency === 'UNKNOWN' ? 'Montant' : currency}</button><button type="button" aria-pressed={chartUnit === 'percent'} disabled={!percentageAvailable} title="Résultat rapporté au capital initial" onClick={() => setUnit('percent')}>% du capital</button></div>}><div className="h-[300px] w-full min-w-0 sm:h-[340px]"><DashboardPerformanceChart data={stats.curve} currency={currency} startingCapital={capital} unit={chartUnit} /></div></Section>
      <DisciplineYearChart hideSummary key={view} journals={journals} selectedDate={disciplineDate} today={today} period={view === 'global' ? 'year' : 'month'} onSelectDate={setDisciplineDate} />
    </div>
    {view === 'global' ? <Section title="Performance mensuelle" action={<span className="text-xs text-muted-foreground">Résultat net / capital initial total · {currency}</span>}><MonthlyPerformanceChart data={monthly} validCapital={percentageAvailable} /></Section> : <div className="grid items-start gap-8 md:grid-cols-2"><Section title="Qualité d’exécution"><dl className="divide-y divide-border/50"><Detail label="Trades dans le plan" value={pct(stats.strategyRate)} /><Detail label="Qualité moyenne des setups" value={quality === null ? '—' : `${quality.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 3`} /><Detail label="Résultat des trades hors plan" value={outsidePlan.length ? money(outsidePlan.reduce((sum, trade) => sum + getNetResult(trade), 0), currency, true) : 'Aucun'} /><Detail label="Gains / pertes moyens" value={stats.totalTrades ? `${money(stats.avgWin ?? 0, currency)} / ${money(stats.avgLoss ?? 0, currency)}` : '—'} /></dl></Section><Section title="Performance nette par devise" action={<span className="text-[10px] text-muted-foreground">% du capital initial</span>}>{capital <= 0 ? <p className="text-sm text-muted-foreground">Renseigne un capital initial positif pour calculer les performances.</p> : instruments.length ? <div style={{height: Math.max(256, instruments.length * 42 + 40)}} role="img" aria-label="Performance nette par paire en pourcentage du capital initial"><ResponsiveContainer width="100%" height="100%"><BarChart data={instruments} layout="vertical" margin={{left:10,right:25}}><XAxis type="number" tickFormatter={value => `${value} %`} tick={{fontSize:11}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={90} tick={{fontSize:11}} axisLine={false} tickLine={false}/><ReferenceLine x={0} stroke="hsl(var(--border))"/><Tooltip {...chartTooltipMotion} cursor={{fill: 'hsl(var(--muted-foreground) / 0.08)'}} formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`, 'Performance nette']}/><Bar dataKey="percent" name="Performance nette" radius={[0,4,4,0]} barSize={22}>{instruments.map(item => <Cell key={item.name} fill={item.net < 0 ? 'hsl(var(--loss))' : 'hsl(var(--profit))'}/>)}</Bar></BarChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground">Aucun trade clôturé sur cette période.</p>}</Section></div>}
    <div className="dashboard-bottom-grid grid items-stretch gap-8 lg:grid-cols-2"><Section title="La régularité, séance après séance" action={<Link className="dashboard-text-link" to="/calendar">Calendrier →</Link>}><div className="mb-5 flex items-baseline gap-2"><span className="text-2xl font-semibold tabular-nums">{stats.daily.length ? `${positiveDays} / ${stats.daily.length}` : '—'}</span><span className="text-xs text-muted-foreground">journées positives</span></div>{days.length ? <div className="flex gap-1.5" role="list" aria-label="Dernières journées de trading">{days.map(item => <div role="listitem" aria-label={`${new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'long' })} : ${money(item.net, currency, true)}`} key={item.date} className="min-w-0 flex-1" title={`${dateLabel(item.date)} : ${money(item.net, currency, true)}`}><span className={`block h-8 rounded-[3px] ${item.net > 0 ? 'bg-profit/65' : item.net < 0 ? 'bg-loss/60' : 'bg-secondary'}`} /><span className="mt-2 block text-center text-[9px] text-muted-foreground">{Number(item.date.slice(-2))}</span></div>)}</div> : <p className="text-xs text-muted-foreground">Une séance enregistrée à la clôture de tes trades.</p>}<dl className="mt-4 divide-y divide-border/50"><Detail label="Meilleure journée" value={stats.bestDay ? `${dateLabel(stats.bestDay.date)} · ${money(stats.bestDay.net, currency, true)}` : '—'} /><Detail label="Commissions / swaps" value={stats.totalTrades ? `${money(-stats.commissionCost, currency)} / ${money(stats.swap, currency, true)}` : '—'} /></dl></Section>
    {view === 'account' && <Section title="Dernières clôtures" action={<Link className="dashboard-text-link" to="/trades">Tous les trades →</Link>}>{stats.closedTrades.length ? <div className="divide-y divide-border/50">{stats.closedTrades.slice(-5).reverse().map(trade => <div key={trade.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-medium">{trade.pair}<span className="ml-2 text-[10px] font-normal text-muted-foreground">{trade.type === 'Buy' ? 'Long' : 'Short'}</span></p><p className="mt-1 truncate text-[10px] text-muted-foreground">{dateLabel(trade.endDate!)} · {trade.strategyRespected ? 'Dans le plan' : 'Hors plan'}</p></div><span className={`shrink-0 text-sm font-medium tabular-nums ${tone(getNetResult(trade))}`}>{money(getNetResult(trade), currency, true)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">Aucun trade clôturé sur cette période.</p>}</Section>}</div>
    {!stats.totalTrades && <p className="border-t border-border/50 pt-5 text-xs text-muted-foreground">{stats.openCount ? `${stats.openCount} position${stats.openCount > 1 ? 's' : ''} ouverte${stats.openCount > 1 ? 's' : ''} : leur résultat sera intégré à la clôture.` : 'Ajoute tes trades pour commencer à construire ce bilan.'} <button type="button" onClick={() => navigate('/trades')} className="ml-1 font-medium text-foreground underline underline-offset-4">Ouvrir Trades</button></p>}
    </>}
  </div>;
}
