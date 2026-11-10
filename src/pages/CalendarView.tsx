import { accountScope } from '@/lib/accountScope';
import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { useDailyJournal } from '@/hooks/useDailyJournal';
import { dashboardAnalytics } from '@/lib/dashboardAnalytics';
import { localDay, newDailyJournal, isTradingDay, previousTradingDay } from '@/lib/discipline';
import DashboardFilter from '@/components/trading/DashboardFilter';
import DailyReview from '@/components/trading/DailyReview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Account } from '@/types/account';

interface Props { activeAccount: Account | null; accounts: Account[]; onSelectAccount: (id: string) => void; }
const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const events: Record<string, string> = {challenge_realise:'Challenge réussi', challenge_echoue:'Challenge échoué', perte_compte:'Compte perdu'};
const percent = (value: number | null) => value === null ? '—' : `${value.toLocaleString('fr-FR', {maximumFractionDigits:2})} %`;
const tone = (value: number) => value > 0 ? 'text-profit' : value < 0 ? 'text-loss' : 'text-foreground';
const fullDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {dateStyle:'long'});
function money(value: number, currency: string, compact = false) {
  try { return new Intl.NumberFormat('fr-FR', {style:'currency', currency, currencyDisplay:'narrowSymbol', signDisplay:'exceptZero', notation:compact ? 'compact' : 'standard', maximumFractionDigits:compact ? 1 : 2}).format(value); }
  catch { return value.toLocaleString('fr-FR', {signDisplay:'exceptZero', maximumFractionDigits:2}); }
}

export default function CalendarView({ activeAccount, accounts, onSelectAccount }: Props) {
  const { state } = useLocation();
  const target = state as {year?:number; month?:number} | null;
  const today = localDay();
  const { getJournal, saveJournal } = useDailyJournal();
  const [date, setDate] = useState(previousTradingDay(today));
  const [month, setMonth] = useState(() => target?.year !== undefined && target?.month !== undefined ? localDay(new Date(target.year, target.month, 1)).slice(0,7) : previousTradingDay(today).slice(0,7));
  const [status, setStatus] = useState('all');
  const [preferredCurrency, setPreferredCurrency] = useState('');
  const [draft, setDraft] = useState(() => getJournal(previousTradingDay(today)) ?? newDailyJournal(previousTradingDay(today)));
  const dirty = useRef(false);
  const saving = useRef(false);
  const filteredAccounts = status === 'all' ? accounts : accounts.filter(account => account.status === status);
  const selectedAccount = filteredAccounts.find(account => account.id === activeAccount?.id) ?? filteredAccounts[0];
  const { allTrades } = useTrades(selectedAccount?.id ?? null, selectedAccount?.initialBalance ?? 0);
  const selectedId = activeAccount?.id === 'all' ? 'all' : selectedAccount?.id;
  const scope = accountScope(filteredAccounts, selectedId, preferredCurrency || selectedAccount?.currency);
  const currency = scope.currency;
  const capital = scope.capital;
  const year = Number(month.slice(0,4)), monthIndex = Number(month.slice(5,7)) - 1;
  const lastDay = localDay(new Date(year, monthIndex + 1, 0));
  const stats = dashboardAnalytics(allTrades.filter(trade => !trade.endDate || isTradingDay(trade.endDate)), {accountIds:scope.accounts.map(account => account.id), from:`${month}-01`, to:lastDay < today ? lastDay : today, startingCapital:capital});
  const daily = new Map(stats.daily.map(day => [day.date, day]));
  const dayTrades = dashboardAnalytics(allTrades.filter(trade => !trade.endDate || isTradingDay(trade.endDate)), {accountIds:scope.accounts.map(account => account.id), from:date, to:date}).closedTrades;
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const rows = Math.ceil((offset + days) / 7);
  const cells = Array.from({length:rows * 7}, (_, index) => index >= offset && index < offset + days ? `${month}-${String(index-offset+1).padStart(2,'0')}` : null);
  const chooseDate = (next: string) => {
    if (!next || !isTradingDay(next) || next > today || saving.current) return;
    if (next !== date && dirty.current && !window.confirm('Changer de journée sans enregistrer les modifications ?')) return;
    if (next !== date) { setDate(next); setDraft(getJournal(next) ?? newDailyJournal(next)); dirty.current = false; }
    setMonth(next.slice(0,7));
  };
  const moveMonth = (offset: number) => setMonth(localDay(new Date(year, monthIndex + offset, 1)).slice(0,7));

  return <div className="calendar-page discipline-page w-full space-y-8 pb-10">
    <header><h1 className="text-2xl font-semibold tracking-tight">Calendrier</h1></header>
    <div className="dashboard-filters"><div className="dashboard-filter-controls">
      <DashboardFilter label="Statut" ariaLabel="Statut des comptes" value={status} onChange={value => { setStatus(value); const matching = accounts.filter(account => value === 'all' || account.status === value); if (matching.length && activeAccount?.id !== 'all' && !matching.some(account => account.id === activeAccount?.id)) onSelectAccount(matching[0].id); }} options={[{value:'all',label:'Tous les comptes'}, {value:'active',label:'Actifs'}, {value:'pending',label:'En attente'}, {value:'terminated',label:'Terminés'}, {value:'paid_out',label:'Payout effectué'}]} />
      <DashboardFilter label="Compte" ariaLabel="Compte du calendrier" value={selectedId ?? ''} onChange={onSelectAccount} disabled={!filteredAccounts.length} options={[{value:'all',label:'Tous les comptes'},...filteredAccounts.map(account => ({value:account.id,label:account.name}))]} />
      {scope.groups.length > 1 && <DashboardFilter label="Devise" ariaLabel="Devise du calendrier" value={scope.currency || 'UNKNOWN'} onChange={setPreferredCurrency} options={scope.groups.map(group => ({value:group.currency,label:group.currency}))}/>}
    </div></div>
    {!scope.accounts.length ? <div className="py-16 text-center text-sm text-muted-foreground"><p>{accounts.length ? 'Aucun compte dans cette sélection.' : 'Ajoute un compte pour suivre tes séances.'}</p><Link to="/accounts" className="dashboard-text-link mt-4 inline-block">Gérer mes comptes →</Link></div> : <>
      <div className="grid grid-cols-3 gap-4 py-3">
        {[{label:'Résultat net du mois',value:money(stats.netProfit,currency),color:tone(stats.netProfit)}, {label:'Trades clôturés',value:String(stats.totalTrades),color:''}, {label:'Win rate',value:percent(stats.winRate),color:''}].map(metric => <div key={metric.label} className="min-w-0 text-center"><p className="text-xs text-muted-foreground">{metric.label}</p><p className={`mt-5 break-words text-lg font-semibold tracking-tight tabular-nums sm:text-[27px] ${metric.color}`}>{metric.value}</p></div>)}
      </div>
      <div className="calendar-review-layout grid items-stretch gap-8 xl:grid-cols-2">
        <section className="calendar-month flex min-w-0 flex-col" aria-label="Calendrier mensuel">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold capitalize" aria-live="polite">{new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</h2>
            <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Mois précédent" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4"/></Button><Button variant="ghost" className="h-10 text-xs" onClick={() => chooseDate(previousTradingDay(today))}>Aujourd’hui</Button><Button variant="outline" size="icon" aria-label="Mois suivant" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4"/></Button></div>
          </header>
          <div className="mb-3 grid grid-cols-7 gap-1" aria-hidden="true">{weekdays.map(day => <span key={day} className="text-center text-[10px] font-medium text-muted-foreground">{day}</span>)}</div>
          <div className="calendar-days grid flex-1 grid-cols-7 gap-1.5" style={{gridTemplateRows:`repeat(${rows}, minmax(78px, 1fr))`}}>
            {cells.map((day,index) => {
              if (!day) return <div key={`empty-${index}`} aria-hidden="true"/>;
              if (!isTradingDay(day)) return <div key={day} className="calendar-weekend" aria-label={`Week-end du ${day}`}><span>{Number(day.slice(-2))}</span></div>;
              const result = daily.get(day);
              const journal = getJournal(day);
              const closedOnDay = stats.closedTrades.filter(trade => trade.endDate?.slice(0,10) === day);
              const strategy = journal ? journal.strategyRespected : closedOnDay.length ? closedOnDay.every(trade => trade.strategyRespected) : undefined;
              const performance = result && capital > 0 ? result.net / capital * 100 : null;
              return <Tooltip key={day}><TooltipTrigger asChild><button type="button" disabled={day > today} onClick={() => chooseDate(day)} aria-label={`Bilan du ${day}`} aria-pressed={date === day} aria-current={day === today ? 'date' : undefined} className={`calendar-day ${result ? result.net > 0 ? 'is-profit' : result.net < 0 ? 'is-loss' : '' : ''}`}>
                <span className="calendar-day-number flex items-center justify-between gap-1">{Number(day.slice(-2))}{journal?.event && <span className="ml-1 text-primary" aria-label={events[journal.event]}>•</span>}{strategy !== undefined && (strategy ? <Check className="h-3 w-3 shrink-0 text-profit" role="img" aria-label="Stratégie respectée"/> : <X className="h-3 w-3 shrink-0 text-loss" role="img" aria-label="Stratégie non respectée"/>)}</span>
                <span className={`calendar-day-result ${tone(result?.net ?? 0)}`}>{result ? capital > 0 ? percent(performance) : money(result.net,currency,true) : ''}</span>
                <span className="calendar-day-count">{result ? `${result.trades} tr.` : ''}</span>
              </button></TooltipTrigger><TooltipContent className="rounded-xl border-border bg-popover px-4 py-3 text-xs text-popover-foreground shadow-sm"><p className="font-medium">{fullDate(day)}</p><p className="mt-2">{result ? `${money(result.net,currency)} · ${result.trades} trade${result.trades > 1 ? 's' : ''}` : 'Aucun trade clôturé'}</p>{journal?.event && <p className="mt-1 text-muted-foreground">{events[journal.event]}</p>}</TooltipContent></Tooltip>;
            })}
          </div>
        </section>
        <section className="discipline-review min-w-0" aria-labelledby="calendar-review-title">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 id="calendar-review-title" className="text-sm font-semibold">Bilan journalier</h2><Input aria-label="Date du bilan" type="date" max={today} value={date} onChange={event => chooseDate(event.target.value)} className="h-10 w-auto max-w-full rounded-[10px] bg-transparent text-xs"/></header>
          <DailyReview key={date} currency={currency} date={date} existing={getJournal(date)} value={draft} onChange={value => {setDraft(value); dirty.current = true;}} psychologyElsewhere trades={dayTrades} saveLabel="Enregistrer la journée" onSave={async value => {saving.current = true; try {await saveJournal(value); dirty.current = false;} finally {saving.current = false;}}}/>
        </section>
      </div>
    </>}
  </div>;
}
