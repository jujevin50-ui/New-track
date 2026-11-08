import { useEffect, useState } from 'react';
import { Check, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { DailyJournal } from '@/hooks/useDailyJournal';
import { getNetResult, type Trade } from '@/types/trade';

interface Props {
  date: string;
  value?: DailyJournal;
  onChange?: (journal: DailyJournal) => void;
  psychologyElsewhere?: boolean;
  saveLabel?: string;
  existing: DailyJournal | null;
  trades: Trade[];
  onSave: (journal: DailyJournal) => Promise<void>;
}

export default function DailyReview({ date, existing, trades, onSave, value, onChange, psychologyElsewhere = false, saveLabel = 'Enregistrer le bilan' }: Props) {
  const [internalDraft, setInternalDraft] = useState<DailyJournal>(() => existing || {
    date, strategyRespected: true, productive: false, mood: 'neutral', discipline: 3, confidence: 3,
    notes: '', lessonsLearned: '', mistakes: [], goals: '', event: null,
  });
  const draft = value ?? internalDraft;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setSaved(false); setError(''); }, [draft]);
  const set = <K extends keyof DailyJournal>(field: K, value: DailyJournal[K]) => {
    const next = { ...draft, [field]: value };
    if (onChange) onChange(next); else setInternalDraft(next);
    setSaved(false); setError('');
  };
  const pnl = trades.reduce((sum, trade) => sum + getNetResult(trade), 0);
  const money = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <form onSubmit={async event => {
      event.preventDefault(); if (saving) return;
      setSaving(true); setError('');
      try { await onSave(draft); setSaved(true); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le bilan.'); }
      finally { setSaving(false); }
    }}>
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-baseline gap-3"><span className={`font-mono text-2xl font-semibold ${pnl > 0 ? 'text-profit' : pnl < 0 ? 'text-loss' : 'text-foreground'}`}>{money(pnl)}</span><span className="text-xs text-muted-foreground">{trades.length} trade{trades.length !== 1 ? 's' : ''}</span></div>
          <div className="flex items-center gap-3"><Label htmlFor="review-productive">Journée productive</Label><Switch id="review-productive" checked={draft.productive === true} onCheckedChange={value => set('productive', value)} /></div>
        </div>
        <div className={`grid gap-5 ${psychologyElsewhere ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div className="space-y-2"><Label id="review-plan">Plan respecté</Label><div role="group" aria-labelledby="review-plan" className="flex gap-1 rounded-xl bg-secondary/50 p-1">{[true, false].map(value => <button key={String(value)} type="button" aria-pressed={draft.strategyRespected === value} onClick={() => set('strategyRespected', value)} className={`h-9 flex-1 rounded-lg text-sm transition-colors ${draft.strategyRespected === value ? 'selected-tab font-medium' : 'text-muted-foreground'}`}>{value ? 'Oui' : 'Non'}</button>)}</div></div>
          {!psychologyElsewhere && (<div className="space-y-2"><Label htmlFor="review-mood">État d’esprit</Label><select id="review-mood" value={draft.mood} onChange={event => set('mood', event.target.value as DailyJournal['mood'])} className="h-11 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm"><option value="excellent">Excellent</option><option value="good">Bien</option><option value="neutral">Neutre</option><option value="bad">Difficile</option><option value="terrible">Très difficile</option></select></div>)}
          <div className="space-y-2"><Label htmlFor="review-event">Événement</Label><select id="review-event" value={draft.event || ''} onChange={event => set('event', event.target.value as DailyJournal['event'] || null)} className="h-11 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm"><option value="">Aucun</option><option value="challenge_realise">Challenge réussi</option><option value="challenge_echoue">Challenge échoué</option><option value="perte_compte">Compte perdu</option></select></div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:row-span-2"><Label htmlFor="review-notes">Notes du jour</Label><Textarea id="review-notes" value={draft.notes} onChange={event => set('notes', event.target.value)} className="min-h-[220px] resize-y rounded-xl border-border/60 bg-secondary/30" /></div>
          <div className="space-y-2"><Label htmlFor="review-lessons">À retenir</Label><Textarea id="review-lessons" value={draft.lessonsLearned} onChange={event => set('lessonsLearned', event.target.value)} className="min-h-24 resize-y rounded-xl border-border/60 bg-secondary/30" /></div>
          <div className="space-y-2"><Label htmlFor="review-goals">Objectif pour la prochaine séance</Label><Textarea id="review-goals" value={draft.goals} onChange={event => set('goals', event.target.value)} className="min-h-24 resize-y rounded-xl border-border/60 bg-secondary/30" /></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {error && <p role="alert" className="mr-auto text-sm text-loss">{error}</p>}
          {saved && <span role="status" className="inline-flex items-center gap-1.5 text-xs text-profit"><Check className="h-3.5 w-3.5" />Enregistré</span>}
          <Button type="submit" className="gap-2 rounded-xl" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saveLabel}</Button>
        </div>
      </fieldset>
    </form>
  );
}
