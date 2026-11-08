import { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Flame, Sparkles, Target, Trophy } from 'lucide-react';
import { useDailyJournal, type DailyJournal } from '@/hooks/useDailyJournal';
import { useTrades } from '@/hooks/useTrades';
import DisciplineYearChart from '@/components/trading/DisciplineYearChart';
import DailyReview from '@/components/trading/DailyReview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Account } from '@/types/account';
import type { Trade } from '@/types/trade';
import { completedMissions, disciplineStats, DISCIPLINE_MISSIONS, localDay, newDailyJournal, shiftDay } from '@/lib/discipline';

const prettyDay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Discipline({ activeAccount }: { activeAccount: Account | null }) {
  const { journals, getJournal, saveJournal } = useDailyJournal();
  const { trades } = useTrades(activeAccount?.id ?? null, activeAccount?.initialBalance ?? 0);
  const today = localDay();
  const [date, setDate] = useState(today);
  const dirty = useRef(false);
  const saving = useRef(false);
  const stats = disciplineStats(journals, today);
  const chooseDate = (next: string) => {
    if (!next || next === date || next > today || saving.current) return;
    if (dirty.current && !window.confirm('Changer de journée sans enregistrer les modifications ?')) return;
    dirty.current = false;
    setDate(next);
  };

  return <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Discipline</h1><p className="mt-1 text-sm text-muted-foreground">Une bonne séance commence par de bonnes habitudes.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Jour précédent" onClick={() => chooseDate(shiftDay(date, -1))}><ChevronLeft /></Button>
        <Input aria-label="Date de discipline" type="date" max={today} value={date} onChange={event => chooseDate(event.target.value)} className="w-auto max-w-full" />
        <Button variant="outline" size="icon" aria-label="Jour suivant" disabled={date >= today} onClick={() => chooseDate(shiftDay(date, 1))}><ChevronRight /></Button>
        {date !== today && <Button variant="ghost" onClick={() => chooseDate(today)}>Aujourd’hui</Button>}
      </div>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ Icon: Flame, value: `${stats.streak} jour${stats.streak === 1 ? '' : 's'}`, label: stats.streak === 1 ? 'de suivi consécutif' : 'de suivi consécutifs' }, { Icon: Sparkles, value: `${stats.xp} XP`, label: 'de bonnes habitudes enregistrées' }, { Icon: Trophy, value: `${stats.days} séance${stats.days === 1 ? '' : 's'}`, label: 'avec une mission accomplie' }].map(({ Icon, value, label }) => <div key={label} className="app-panel surface flex items-center gap-3 px-5 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-secondary/80"><Icon className="h-5 w-5" strokeWidth={1.6} /></span><div><p className="text-lg font-semibold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>)}
    </div>
    <DisciplineSession key={date} date={date} existing={getJournal(date)} trades={trades.filter(trade => trade.endDate?.slice(0, 10) === date)} accountName={activeAccount?.name} onDirty={value => { dirty.current = value; }} onSaving={value => { saving.current = value; }} onSave={saveJournal} />
    <DisciplineYearChart journals={journals} selectedDate={date} today={today} onSelectDate={chooseDate} />
  </div>;
}

function DisciplineSession({ date, existing, trades, accountName, onDirty, onSaving, onSave }: { date: string; existing: DailyJournal | null; trades: Trade[]; accountName?: string; onDirty: (dirty: boolean) => void; onSaving: (saving: boolean) => void; onSave: (journal: DailyJournal) => Promise<void> }) {
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

  return <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <fieldset disabled={saving} className="min-w-0 space-y-5">
      <section className="app-panel surface overflow-hidden">
        <div className="border-b border-border/60 p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Target className="h-4 w-4" /><h2 className="text-sm font-semibold">Mes missions du jour</h2></div><span className="rounded-lg bg-secondary/70 px-2.5 py-1 text-xs font-medium">{missions.length * 20} / 100 XP</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Missions accomplies" aria-valuemin={0} aria-valuemax={5} aria-valuenow={missions.length}><div className="h-full rounded-full bg-foreground transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${missions.length * 20}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">{missions.length === 5 ? 'Séance complète. Chaque bonne habitude compte.' : `${missions.length} sur 5 accomplies · Le processus avant le résultat.`}</p>
        </div>
        <div className="space-y-1.5 p-3">{DISCIPLINE_MISSIONS.map((mission, index) => {
          const checked = missions.includes(mission.id);
          return <button key={mission.id} type="button" aria-pressed={checked} onClick={() => updateTracking({ missions: checked ? missions.filter(id => id !== mission.id) : [...missions, mission.id] })} className={`flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition-colors ${checked ? 'border-foreground/20 bg-secondary/70' : 'border-transparent hover:border-border/60 hover:bg-secondary/40'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-xs font-semibold ${checked ? 'border-transparent bg-foreground text-background' : 'border-border/70 text-muted-foreground'}`}>{checked ? <Check className="h-4 w-4" /> : `0${index + 1}`}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{mission.title}</span>{mission.detail && <span className="mt-0.5 block text-xs text-muted-foreground">{mission.detail}</span>}</span><span className="shrink-0 text-[10px] text-muted-foreground">+20 XP</span></button>;
        })}</div>
      </section>
    </fieldset>
    <section className="app-panel surface min-w-0 p-5 sm:p-6" aria-labelledby="discipline-review-title">
      <div className="mb-6"><h2 id="discipline-review-title" className="text-lg font-semibold tracking-tight">Bilan journalier</h2><p className="mt-1 text-xs capitalize text-muted-foreground">{prettyDay(date)}{accountName ? ` · ${accountName}` : ''}</p></div>
      <DailyReview date={date} existing={existing} value={draft} onChange={update} psychologyElsewhere trades={trades} onSave={save} saveLabel="Enregistrer la journée" />
    </section>
  </div>;
}
