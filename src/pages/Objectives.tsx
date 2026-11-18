import { useRef, useState, type FormEvent } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, Crosshair, ListChecks, Minus, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import { useDailyJournal } from '@/hooks/useDailyJournal';
import { useTrades } from '@/hooks/useTrades';
import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';
import { localDay, shiftDay } from '@/lib/discipline';
import { measureObjective, OBJECTIVE_METRICS, type Objective, type ObjectiveMetric, type ObjectiveStatus } from '@/lib/objectives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const metricIcons = { reviews: ClipboardCheck, missions: ListChecks, plan: Crosshair, manual: Target };
const statuses = { active: 'En cours', upcoming: 'À venir', achieved: 'Atteints', expired: 'Échus' };
const statusOrder = { active: 0, upcoming: 1, achieved: 2, expired: 3 };
const statusLabel = { ...statuses, achieved: 'Atteint', expired: 'Échu' };
const dateLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatDate = (day: string) => dateLabel.format(new Date(`${day}T00:00:00Z`));

type Draft = Omit<Objective, 'target' | 'manualProgress'> & { target: string; manualProgress: string };

export default function Objectives() {
  const { data, addRow, updateRow, deleteRow } = useData();
  const { journals } = useDailyJournal();
  const { allTrades } = useTrades(null, 0);
  const today = localDay();
  const [filter, setFilter] = useState<ObjectiveStatus | 'all'>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<Objective | null>(null);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const { saved, saveInBackground } = useSaveConfirmation();

  const entries = data.objectives.map(objective => ({ objective, ...measureObjective(objective, today, journals, allTrades) }))
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.objective.end.localeCompare(b.objective.end));
  const counts = { active: 0, upcoming: 0, achieved: 0, expired: 0 };
  entries.forEach(({ status }) => { counts[status]++; });
  const visible = entries.filter(entry => filter === 'all' || entry.status === filter);

  const openEditor = (objective?: Objective) => {
    setError('');
    setDraft(objective ? { ...objective, target: String(objective.target), manualProgress: String(objective.manualProgress) } : {
      id: '', title: '', note: '', metric: 'manual',
      start: today, end: shiftDay(today, 6), target: '1', manualProgress: '0',
    });
  };

  const write = async (key: string, action: () => Promise<void>, onSuccess: () => void, message: string) => {
    if (lock.current || saved) return;
    lock.current = true;
    setPending(key);
    setError('');
    try {
      await action();
      onSuccess();
    } catch {
      setError(message);
    } finally {
      lock.current = false;
      setPending('');
    }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || lock.current || saved) return;
    const title = draft.title.trim();
    const target = Number(draft.target);
    const manualProgress = draft.metric === 'manual' ? Number(draft.manualProgress) : 0;
    if (!title || !draft.start || !draft.end || draft.end < draft.start || !Number.isSafeInteger(target) || target < 1 || !Number.isSafeInteger(manualProgress) || manualProgress < 0) {
      setError('Vérifie le nom, les dates et la cible. La cible doit être un entier positif.');
      return;
    }
    const objective: Objective = { ...draft, id: draft.id || crypto.randomUUID(), title, note: draft.note.trim(), target, manualProgress };
    setError('');
    setFilter('all');
    saveInBackground(
      () => draft.id ? updateRow('objectives', objective.id, objective) : addRow('objectives', objective),
      'Impossible d’enregistrer cet objectif.',
      () => setDraft(null),
    );
  };

  const changeProgress = (objective: Objective, step: number) => {
    const manualProgress = Math.max(0, objective.manualProgress + step);
    const reached = objective.manualProgress < objective.target && manualProgress >= objective.target;
    void write(objective.id, () => updateRow('objectives', objective.id, { manualProgress }), () => {
      if (reached) toast.success('Objectif atteint', { description: objective.title });
    }, 'Impossible de mettre à jour la progression.');
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Objectifs</h1>
          <p className="mt-2 text-sm text-muted-foreground">Fixe une cible, choisis une échéance et suis ta progression.</p>
        </div>
        <Button onClick={() => openEditor()}><Plus aria-hidden="true" />Nouvel objectif</Button>
      </header>

      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4 border-y border-border/70 py-5 sm:grid-cols-4">
          {(Object.keys(statuses) as ObjectiveStatus[]).map(status => (
            <div key={status}>
              <p className="text-sm text-muted-foreground">{statuses[status]}</p>
              <p className={`mt-1 text-3xl font-semibold tabular-nums ${status === 'achieved' ? 'text-profit' : ''}`}>{counts[status]}</p>
            </div>
          ))}
        </div>
      )}

      <section aria-labelledby="my-objectives" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-objectives" className="text-lg font-semibold tracking-tight">Mes objectifs</h2>
          {entries.length > 0 && (
            <div role="group" aria-label="État des objectifs" className="flex flex-wrap gap-1">
              {(['all', 'active', 'upcoming', 'achieved', 'expired'] as const).map(value => (
                <Button key={value} size="sm" variant={filter === value ? 'secondary' : 'ghost'} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                  {value === 'all' ? 'Tous' : statuses[value]}
                </Button>
              ))}
            </div>
          )}
        </div>
        {error && !draft && !removing && <p role="alert" className="text-sm text-loss">{error}</p>}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <Target aria-hidden="true" className="mx-auto mb-3 size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{entries.length ? 'Aucun objectif dans cette vue.' : 'Aucun objectif pour le moment.'}</p>
          </div>
        ) : (
          <div className="grid gap-3 min-[1250px]:grid-cols-2">
            {visible.map(({ objective, value, percent, status }) => {
              const Icon = status === 'achieved' ? CheckCircle2 : metricIcons[objective.metric];
              const metric = OBJECTIVE_METRICS[objective.metric];
              return (
                <article key={objective.id} className="objective-card flex min-w-0 flex-col gap-4 rounded-2xl border border-border/70 bg-card/50 p-4 sm:p-5" data-status={status}>
                  <div className="flex items-start gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${status === 'achieved' ? 'bg-profit/10 text-profit' : 'bg-secondary text-primary'}`}><Icon aria-hidden="true" className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold leading-snug">{objective.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${status === 'achieved' ? 'bg-profit/10 text-profit' : 'bg-secondary/60 text-muted-foreground'}`}>{statusLabel[status]}</span>
                  </div>
                  {objective.note && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{objective.note}</p>}
                  <div className="mt-auto">
                    <div className="mb-2 flex items-baseline justify-between gap-2 text-sm tabular-nums" aria-live="polite">
                      <span><strong className="text-lg font-semibold">{value}</strong> <span className="text-muted-foreground">/ {objective.target} {metric.unit}</span></span>
                      <span className={status === 'achieved' ? 'font-medium text-profit' : 'text-muted-foreground'}>{percent} %</span>
                    </div>
                    <Progress value={percent} aria-label={`Progression de ${objective.title}`} className="h-1.5" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays aria-hidden="true" className="size-4 shrink-0" />{formatDate(objective.start)} – {formatDate(objective.end)}</span>
                    <div className="flex items-center gap-1">
                      {objective.metric === 'manual' && <>
                        <Button variant="outline" size="icon" aria-label={`Retirer une étape de ${objective.title}`} disabled={Boolean(pending) || value === 0} onClick={() => changeProgress(objective, -1)}><Minus aria-hidden="true" /></Button>
                        <Button variant="outline" size="icon" aria-label={`Ajouter une étape à ${objective.title}`} disabled={Boolean(pending) || value >= Number.MAX_SAFE_INTEGER} onClick={() => changeProgress(objective, 1)}><Plus aria-hidden="true" /></Button>
                      </>}
                      <Button variant="ghost" size="icon" aria-label={`Modifier ${objective.title}`} disabled={Boolean(pending)} onClick={() => openEditor(objective)}><Pencil aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Supprimer ${objective.title}`} disabled={Boolean(pending)} onClick={() => { setError(''); setRemoving(objective); }}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open && !pending && !saved) setDraft(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Modifier l’objectif' : 'Nouvel objectif'}</DialogTitle>
            <DialogDescription>La période inclut le premier et le dernier jour.</DialogDescription>
          </DialogHeader>
          {draft && <form onSubmit={save} className="space-y-4">
            <fieldset disabled={Boolean(pending) || saved} className="min-w-0 space-y-4">
              <div className="space-y-2"><Label htmlFor="objective-title">Nom de l’objectif</Label><Input id="objective-title" required maxLength={100} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></div>
              <div className="space-y-2">
                <Label htmlFor="objective-metric">Suivi</Label>
                <select id="objective-metric" className="ui-select-trigger w-full rounded-[10px] border border-border bg-background px-3 text-sm" value={draft.metric} onChange={event => setDraft({ ...draft, metric: event.target.value as ObjectiveMetric })}>
                  {Object.entries(OBJECTIVE_METRICS).map(([key, metric]) => <option key={key} value={key}>{metric.label}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">{OBJECTIVE_METRICS[draft.metric].description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="objective-target">Cible ({OBJECTIVE_METRICS[draft.metric].unit})</Label><Input id="objective-target" type="number" required min={1} step={1} value={draft.target} onChange={event => setDraft({ ...draft, target: event.target.value })} /></div>
                {draft.metric === 'manual' && <div className="space-y-2"><Label htmlFor="objective-progress">Étapes déjà réalisées</Label><Input id="objective-progress" type="number" min={0} step={1} value={draft.manualProgress} onChange={event => setDraft({ ...draft, manualProgress: event.target.value })} /></div>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="objective-start">Début</Label><Input id="objective-start" type="date" required max={draft.end || undefined} value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="objective-end">Échéance</Label><Input id="objective-end" type="date" required min={draft.start || undefined} value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="objective-note">Note (facultative)</Label><Textarea id="objective-note" maxLength={1000} value={draft.note} onChange={event => setDraft({ ...draft, note: event.target.value })} /></div>
            </fieldset>
            {error && <p role="alert" className="text-sm text-loss">{error}</p>}
            <div className="ui-form-footer">
              <Button type="button" variant="ghost" disabled={Boolean(pending) || saved} onClick={() => setDraft(null)}>Annuler</Button>
              <Button type="submit" saved={saved} disabled={saved}>{saved ? 'Pris en compte' : 'Enregistrer'}</Button>
            </div>
          </form>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={open => { if (!open && !pending) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet objectif ?</AlertDialogTitle><AlertDialogDescription>{removing?.title}</AlertDialogDescription></AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-loss">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(pending)}>Annuler</AlertDialogCancel>
            <Button variant="destructive" loading={pending === 'delete'} onClick={() => {
              if (removing) void write('delete', () => deleteRow('objectives', removing.id), () => setRemoving(null), 'Impossible de supprimer cet objectif.');
            }}>Supprimer</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
