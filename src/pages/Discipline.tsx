import DashboardFilter from '@/components/trading/DashboardFilter';
import { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDailyJournal, type DailyJournal } from '@/hooks/useDailyJournal';
import { useTrades } from '@/hooks/useTrades';
import DisciplineYearChart from '@/components/trading/DisciplineYearChart';
import DailyReview from '@/components/trading/DailyReview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Account } from '@/types/account';
import type { Trade } from '@/types/trade';
import { completedMissions, disciplineStats, DISCIPLINE_MISSIONS, localDay, newDailyJournal, isTradingDay, previousTradingDay, shiftTradingDay } from '@/lib/discipline';



export default function Discipline({ activeAccount, accounts, onSelectAccount }: { activeAccount: Account | null; accounts: Account[]; onSelectAccount: (id: string) => void }) {
  const { journals, getJournal, saveJournal } = useDailyJournal();
  const selectedAccount = accounts.find(account => account.id === activeAccount?.id) ?? accounts[0];
  const { trades } = useTrades(selectedAccount?.id ?? null, selectedAccount?.initialBalance ?? 0);
  const today = localDay();
  const [date, setDate] = useState(previousTradingDay(today));
  const [chartPeriod, setChartPeriod] = useState<'month' | 'year'>('year');
  const dirty = useRef(false);
  const saving = useRef(false);
  const stats = disciplineStats(journals, today);
  const chooseDate = (next: string) => {
    if (!next || !isTradingDay(next) || next === date || next > today || saving.current) return;
    if (dirty.current && !window.confirm('Changer de journée sans enregistrer les modifications ?')) return;
    dirty.current = false;
    setDate(next);
  };

  return <div className="discipline-page mx-auto w-full space-y-8 pb-10">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Discipline</h1></div>
    </header>
    <div className="dashboard-filters"><div className="dashboard-filter-controls"><DashboardFilter label="Compte" ariaLabel="Compte du bilan" value={selectedAccount?.id ?? ''} onChange={onSelectAccount} disabled={!accounts.length} options={accounts.map(account => ({value:account.id, label:account.name}))} /><div><span className="dashboard-filter-caption">Journée</span>      <div className="discipline-date-control flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Jour précédent" onClick={() => chooseDate(shiftTradingDay(date, -1))}><ChevronLeft /></Button>
        <Input aria-label="Date de discipline" type="date" max={today} value={date} onChange={event => chooseDate(event.target.value)} className="h-10 w-auto max-w-full rounded-[10px] bg-transparent text-xs" />
        <Button variant="outline" size="icon" aria-label="Jour suivant" disabled={shiftTradingDay(date, 1) > today} onClick={() => chooseDate(shiftTradingDay(date, 1))}><ChevronRight /></Button>
        {date !== previousTradingDay(today) && <Button variant="ghost" onClick={() => chooseDate(previousTradingDay(today))}>Aujourd’hui</Button>}
      </div>
</div></div></div>
    <div className="grid grid-cols-3 gap-4 py-4">
      {[{label: 'Série en cours', value: stats.streak, unit: stats.streak === 1 ? 'jour' : 'jours'}, {label: 'Séances suivies', value: stats.days, unit: stats.days === 1 ? 'séance' : 'séances'}, {label: 'Expérience', value: stats.xp, unit: 'XP'}].map(metric => <div key={metric.label} className="min-w-0 text-center"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-5 text-2xl font-semibold tracking-tight tabular-nums sm:text-[27px]">{metric.value}<span className="ml-2 text-[11px] font-normal text-muted-foreground">{metric.unit}</span></p></div>)}
    </div>
    <DisciplineSession key={date} date={date} existing={getJournal(date)} trades={trades.filter(trade => trade.endDate?.slice(0, 10) === date)} currency={selectedAccount?.currency ?? ''} onDirty={value => { dirty.current = value; }} onSaving={value => { saving.current = value; }} onSave={saveJournal} />
    <DisciplineYearChart hideSummary period={chartPeriod} onPeriodChange={setChartPeriod} journals={journals} selectedDate={date} today={today} onSelectDate={chooseDate} />
  </div>;
}

function DisciplineSession({ date, existing, trades, currency, onDirty, onSaving, onSave }: { date: string; existing: DailyJournal | null; trades: Trade[]; currency: string; onDirty: (dirty: boolean) => void; onSaving: (saving: boolean) => void; onSave: (journal: DailyJournal) => Promise<void> }) {
  const [draft, setDraft] = useState(() => existing ?? newDailyJournal(date));
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const missions = completedMissions(draft);
  const tracking = draft.disciplineTracking ?? { missions: [], stress: 3, triggers: [] };
  const update = (next: DailyJournal) => { setDraft(next); onDirty(true); };
  const updateTracking = (patch: Partial<NonNullable<DailyJournal['disciplineTracking']>>) => update({ ...draft, disciplineTracking: { ...tracking, ...patch } });
  const save = async (journal: DailyJournal) => {
    if (busy.current) return;
    busy.current = true; setSaving(true); onSaving(true);
    try { await onSave({ ...journal, disciplineTracking: journal.disciplineTracking ?? tracking }); onDirty(false); }
    finally { busy.current = false; setSaving(false); onSaving(false); }
  };

  return <div className="discipline-session grid items-stretch gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <fieldset disabled={saving} className="min-w-0 space-y-5">
      <section className="min-w-0">
        <div className="pb-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Mes missions du jour</h2></div><span className="text-xs font-medium tabular-nums text-muted-foreground">{missions.length * 20} / 100 XP</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Missions accomplies" aria-valuemin={0} aria-valuemax={5} aria-valuenow={missions.length}><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${missions.length * 20}%` }} /></div>

        </div>
        <div className="space-y-2">{DISCIPLINE_MISSIONS.map((mission, index) => {
          const checked = missions.includes(mission.id);
          return <button key={mission.id} type="button" aria-pressed={checked} onClick={() => updateTracking({ missions: checked ? missions.filter(id => id !== mission.id) : [...missions, mission.id] })} className={`flex w-full items-center gap-3 discipline-mission rounded-[10px] border p-3 text-left transition-colors ${checked ? 'border-transparent bg-primary/10' : 'border-transparent hover:border-border/60 hover:bg-secondary/40'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-xs font-semibold ${checked ? 'border-transparent bg-primary text-primary-foreground' : 'border-border/70 text-muted-foreground'}`}>{checked ? <Check className="h-4 w-4" /> : `0${index + 1}`}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{mission.title}</span>{mission.detail && <span className="mt-0.5 block text-xs text-muted-foreground">{mission.detail}</span>}</span><span className="shrink-0 text-[10px] text-muted-foreground">+20 XP</span></button>;
        })}</div>
      </section>
    </fieldset>
    <section className="discipline-review min-w-0" aria-labelledby="discipline-review-title">
      <div className="mb-6"><h2 id="discipline-review-title" className="text-sm font-semibold tracking-tight">Bilan journalier</h2></div>
      <DailyReview currency={currency} date={date} existing={existing} value={draft} onChange={update} psychologyElsewhere trades={trades} onSave={save} saveLabel="Enregistrer la journée" />
    </section>
  </div>;
}
