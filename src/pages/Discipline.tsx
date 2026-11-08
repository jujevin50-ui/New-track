import { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Flame, Sparkles, Target, Trophy, Brain } from 'lucide-react';
import { useDailyJournal, type DailyJournal } from '@/hooks/useDailyJournal';
import { useTrades } from '@/hooks/useTrades';
import DailyReview from '@/components/trading/DailyReview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Account } from '@/types/account';
import type { Trade } from '@/types/trade';
import { completedMissions, disciplineStats, DISCIPLINE_MISSIONS, DISCIPLINE_TRIGGERS, localDay, MOODS, newDailyJournal, shiftDay } from '@/lib/discipline';

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
    <section className="app-panel surface p-5" aria-label="Historique de discipline">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Les 7 derniers jours</h2><span className="text-xs text-muted-foreground">Missions enregistrées</span></div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3">{Array.from({ length: 7 }, (_, index) => shiftDay(today, index - 6)).map(day => {
        const count = completedMissions(getJournal(day)).length;
        return <button key={day} type="button" aria-label={`${prettyDay(day)}, ${count} missions sur 5`} aria-pressed={date === day} onClick={() => chooseDate(day)} className={`flex min-w-0 flex-col items-center gap-2 rounded-[10px] border px-1 py-3 text-xs transition-colors ${date === day ? 'selected-tab border-transparent' : 'border-border/60 hover:bg-secondary/60'}`}><span className={date === day ? 'opacity-75' : 'text-muted-foreground'}>{new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span><span className="text-sm font-semibold">{Number(day.slice(-2))}</span><span className="font-mono text-[10px]">{count}/5</span></button>;
      })}</div>
    </section>
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
    try { await onSave(journal); onDirty(false); }
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
          return <button key={mission.id} type="button" aria-pressed={checked} onClick={() => updateTracking({ missions: checked ? missions.filter(id => id !== mission.id) : [...missions, mission.id] })} className={`flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition-colors ${checked ? 'border-foreground/20 bg-secondary/70' : 'border-transparent hover:border-border/60 hover:bg-secondary/40'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-xs font-semibold ${checked ? 'border-transparent bg-foreground text-background' : 'border-border/70 text-muted-foreground'}`}>{checked ? <Check className="h-4 w-4" /> : `0${index + 1}`}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{mission.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{mission.detail}</span></span><span className="shrink-0 text-[10px] text-muted-foreground">+20 XP</span></button>;
        })}</div>
      </section>
      <section className="app-panel surface space-y-5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4" />Mon état d’esprit</h2>
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Humeur de la séance">{MOODS.map(mood => <button key={mood.value} type="button" aria-pressed={draft.mood === mood.value} onClick={() => update({ ...draft, mood: mood.value })} className={`flex min-w-0 flex-col items-center gap-2 rounded-[10px] border px-0.5 py-3 transition-colors ${draft.mood === mood.value ? 'selected-tab border-transparent' : 'border-border/60 hover:bg-secondary/60'}`}><span className="text-xl" aria-hidden="true">{mood.face}</span><span className="text-[10px] sm:text-xs">{mood.label}</span></button>)}</div>
        <div className="space-y-4">{[{ id: 'stress', label: 'Stress', value: tracking.stress, ends: ['Calme', 'Très élevé'], onChange: (value: number) => updateTracking({ stress: value }) }, { id: 'confidence', label: 'Confiance', value: draft.confidence, ends: ['Fragile', 'Solide'], onChange: (value: number) => update({ ...draft, confidence: value }) }, { id: 'discipline', label: 'Discipline ressentie', value: draft.discipline, ends: ['À travailler', 'Maîtrisée'], onChange: (value: number) => update({ ...draft, discipline: value }) }].map(scale => <div key={scale.id}><div className="mb-2 flex items-center justify-between"><label htmlFor={`discipline-${scale.id}`} className="text-xs font-medium">{scale.label}</label><span className="text-xs text-muted-foreground">{scale.value}/5</span></div><input id={`discipline-${scale.id}`} type="range" min={1} max={5} step={1} value={scale.value} onChange={event => scale.onChange(Number(event.target.value))} className="block h-5 w-full cursor-pointer accent-foreground" /><div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{scale.ends[0]}</span><span>{scale.ends[1]}</span></div></div>)}</div>
        <div><h3 className="mb-2 text-xs font-medium">Ce qui m’a déstabilisé</h3><div className="flex flex-wrap gap-1.5">{DISCIPLINE_TRIGGERS.map(trigger => <button type="button" key={trigger} aria-pressed={tracking.triggers.includes(trigger)} onClick={() => updateTracking({ triggers: tracking.triggers.includes(trigger) ? tracking.triggers.filter(value => value !== trigger) : [...tracking.triggers, trigger] })} className={`rounded-[10px] border px-3 py-2 text-xs transition-colors ${tracking.triggers.includes(trigger) ? 'selected-tab border-transparent' : 'border-border/70 hover:bg-secondary/60'}`}>{trigger}</button>)}</div></div>
      </section>
    </fieldset>
    <section className="app-panel surface min-w-0 p-5 sm:p-6" aria-labelledby="discipline-review-title">
      <div className="mb-6"><h2 id="discipline-review-title" className="text-lg font-semibold tracking-tight">Bilan journalier</h2><p className="mt-1 text-xs capitalize text-muted-foreground">{prettyDay(date)}{accountName ? ` · ${accountName}` : ''}</p></div>
      <DailyReview date={date} existing={existing} value={draft} onChange={update} psychologyElsewhere trades={trades} onSave={save} saveLabel="Enregistrer la journée" />
    </section>
  </div>;
}
