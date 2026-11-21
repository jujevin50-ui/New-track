import { useRef, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import { useDailyJournal } from '@/hooks/useDailyJournal';
import { useTrades } from '@/hooks/useTrades';
import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';
import { queueBackgroundSave } from '@/lib/backgroundSaves';
import { localDay } from '@/lib/discipline';
import { measureObjective, type Objective } from '@/lib/objectives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Draft = Pick<Objective, 'id' | 'title' | 'note'>;

export default function Objectives() {
  const { data, addRow, updateRow, deleteRow } = useData();
  const { journals } = useDailyJournal();
  const { allTrades } = useTrades(null, 0);
  const today = localDay();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<Objective | null>(null);
  const [pending, setPending] = useState('');
  const [pendingCompletion, setPendingCompletion] = useState(() => new Map<string, boolean>());
  const [error, setError] = useState('');
  const lock = useRef(false);
  const { saved, saveInBackground } = useSaveConfirmation();

  const openEditor = (objective?: Objective) => {
    setError('');
    setDraft(objective ? { id: objective.id, title: objective.title, note: objective.note } : { id: '', title: '', note: '' });
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
    if (!title) {
      setError('Saisis le nom de l’objectif.');
      return;
    }
    const details = { title, note: draft.note.trim() };
    const objective: Objective = {
      ...details, id: draft.id || crypto.randomUUID(), completed: false,
      metric: 'manual', start: today, end: today, target: 1, manualProgress: 0,
    };
    setError('');
    saveInBackground(
      () => draft.id ? updateRow('objectives', draft.id, details) : addRow('objectives', objective),
      'Impossible d’enregistrer cet objectif.',
      () => setDraft(null),
    );
  };

  const toggleCompleted = (objective: Objective, completed: boolean) => {
    if (lock.current || saved || pendingCompletion.has(objective.id)) return;
    setPendingCompletion(current => new Map(current).set(objective.id, completed));
    const clearCompletion = () => {
      setPendingCompletion(current => {
        const next = new Map(current);
        next.delete(objective.id);
        return next;
      });
    };
    queueBackgroundSave(async () => {
      await updateRow('objectives', objective.id, { completed });
      clearCompletion();
      if (completed) toast.success('Objectif atteint', { description: objective.title });
    }, 'Impossible de modifier l’état de cet objectif.', clearCompletion);
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Objectifs</h1>
        <Button onClick={() => openEditor()}><Plus aria-hidden="true" />Nouvel objectif</Button>
      </header>

      <section aria-label="Mes objectifs">
        {error && !draft && !removing && <p role="alert" className="mb-3 text-sm text-loss">{error}</p>}
        {data.objectives.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucun objectif pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {data.objectives.map(objective => {
              const completionPending = pendingCompletion.has(objective.id);
              const completed = pendingCompletion.get(objective.id) ?? objective.completed
                ?? (measureObjective(objective, today, journals, allTrades).status === 'achieved');
              return (
                <li key={objective.id} className="objective-card flex min-w-0 items-start gap-2 rounded-xl border border-border/70 p-3">
                  <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 px-1 py-2.5">
                    <Checkbox
                      aria-label={`Objectif atteint : ${objective.title}`}
                      checked={completed}
                      disabled={Boolean(pending) || completionPending}
                      onCheckedChange={checked => toggleCompleted(objective, checked === true)}
                      className="mt-0.5 disabled:opacity-100"
                    />
                    <span className="min-w-0">
                      <span className={`block break-words font-medium ${completed ? 'text-muted-foreground line-through' : ''}`}>{objective.title}</span>
                      {objective.note && <span className="mt-1 block whitespace-pre-wrap break-words text-sm text-muted-foreground">{objective.note}</span>}
                    </span>
                  </label>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Modifier ${objective.title}`} disabled={Boolean(pending)} onClick={() => openEditor(objective)}><Pencil aria-hidden="true" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Supprimer ${objective.title}`} disabled={Boolean(pending) || completionPending} onClick={() => { setError(''); setRemoving(objective); }}><Trash2 aria-hidden="true" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open && !pending && !saved) setDraft(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Modifier l’objectif' : 'Nouvel objectif'}</DialogTitle>
            <DialogDescription className="sr-only">Renseigne le nom de ton objectif.</DialogDescription>
          </DialogHeader>
          {draft && <form onSubmit={save} className="space-y-4">
            <fieldset disabled={Boolean(pending) || saved} className="min-w-0 space-y-4">
              <div className="space-y-2"><Label htmlFor="objective-title">Nom de l’objectif</Label><Input id="objective-title" required maxLength={100} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></div>
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
