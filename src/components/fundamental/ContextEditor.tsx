import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { shiftDay } from '@/lib/discipline';
import {
  BANKS, BLOCK_TITLES, CURRENCIES, type BlockKey, type EconomicEvent, type FundamentalBlocks, type WeekContext,
} from '@/lib/fundamentalContext';

const selectClass = 'ui-select-trigger w-full rounded-[10px] border border-input bg-background px-3 text-sm';
const blankBank = { rate: '', meeting: '', tone: '' };

interface Field {
  key: string;
  label: string;
  options?: string[];
  decimal?: boolean;
  multiline?: boolean;
}

const fields: Partial<Record<BlockKey | 'pair', Field[]>> = {
  regime: [{ key: 'regime', label: 'Régime', options: ['Risk-on', 'Risk-off'] }, { key: 'vix', label: 'VIX', decimal: true }],
  dollar: [{ key: 'dxy', label: 'DXY', decimal: true }, { key: 'us10y', label: 'US10Y (%)', decimal: true }, { key: 'fedBias', label: 'Biais Fed' }],
  week: [{ key: 'events', label: 'Événements majeurs', multiline: true }],
  pair: [{ key: 'bias', label: 'Biais', options: ['Haussier', 'Baissier', 'Neutre'] }, { key: 'differential', label: 'Différentiel de taux (points de %)', decimal: true }, { key: 'driver', label: 'Driver clé', multiline: true }],
  notes: [{ key: 'text', label: 'Notes et news clés', multiline: true }],
};

type SaveBlock = (block: BlockKey, content: FundamentalBlocks[BlockKey]) => Promise<void>;

interface EditorProps {
  block: BlockKey;
  monday: string;
  existing: WeekContext;
  onSave: SaveBlock;
  onClose: () => void;
}

export function ContextEditor({ block, monday, existing, onSave, onClose }: EditorProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => ['calendar', 'banks'].includes(block) ? {} : { ...(existing[block] as Record<string, string> | undefined) },
  );
  const [events, setEvents] = useState(() => existing.calendar ?? []);
  const [banks, setBanks] = useState(() => existing.banks ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sameWeek = shiftDay(monday, 6);
  const simpleFields = fields[block] ?? fields.pair;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      const content = block === 'calendar' ? events.map(item => ({ ...item, event: item.event.trim() }))
        : block === 'banks' ? banks : clean as FundamentalBlocks[BlockKey];
      if (block === 'calendar' && events.some(item => !item.event.trim())) {
        setError('Renseigne le nom de chaque événement ou supprime la ligne.');
        return;
      }
      await onSave(block, content);
      onClose();
    } catch {
      setError('La sauvegarde a échoué. Réessaie sans fermer le formulaire.');
    } finally {
      setSaving(false);
    }
  };

  const updateEvent = (id: string, field: keyof Omit<EconomicEvent, 'id'>, value: string) => {
    setEvents(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent className={block === 'calendar' || block === 'banks' ? 'sm:max-w-3xl' : 'sm:max-w-lg'}>
        <DialogHeader>
          <DialogTitle>Modifier · {BLOCK_TITLES[block]}</DialogTitle>
          <DialogDescription className={block === 'calendar' ? undefined : 'sr-only'}>
            {block === 'calendar' ? 'Renseigne les événements à impact fort. Les heures sont celles de Paris.' : 'Saisie manuelle du contexte pour la semaine affichée.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={saving} className="min-w-0 space-y-4">
            {block === 'calendar' ? (
              <>
                {events.map((item, index) => (
                  <fieldset key={item.id} className="min-w-0 space-y-3 rounded-xl border border-border p-3">
                    <legend className="px-1 text-sm font-medium">Événement {index + 1}</legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="grid min-w-0 gap-1 text-sm">Date<Input required type="date" min={monday} max={sameWeek} value={item.date} onChange={e => updateEvent(item.id, 'date', e.target.value)} /></label>
                      <label className="grid gap-1 text-sm">Heure<Input required type="time" value={item.time} onChange={e => updateEvent(item.id, 'time', e.target.value)} /></label>
                      <label className="grid gap-1 text-sm">Devise<select className={selectClass} value={item.currency} onChange={e => updateEvent(item.id, 'currency', e.target.value)}>{CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}</select></label>
                    </div>
                    <label className="grid gap-1 text-sm">Nom de l’événement<Input required maxLength={160} value={item.event} onChange={e => updateEvent(item.id, 'event', e.target.value)} /></label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {([['forecast', 'Prévision'], ['previous', 'Précédent'], ['actual', 'Réel']] as const).map(([key, label]) => (
                        <label key={key} className="grid gap-1 text-sm">{label}<Input maxLength={32} value={item[key]} onChange={e => updateEvent(item.id, key, e.target.value)} /></label>
                      ))}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEvents(items => items.filter(current => current.id !== item.id))}><Trash2 aria-hidden="true" />Retirer l’événement {index + 1}</Button>
                  </fieldset>
                ))}
                <Button type="button" variant="outline" onClick={() => setEvents(items => [...items, { id: crypto.randomUUID(), date: monday, time: '', currency: 'USD', event: '', forecast: '', previous: '', actual: '' }])}><Plus aria-hidden="true" />Ajouter un événement</Button>
              </>
            ) : block === 'banks' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {BANKS.map(bank => {
                  const entry = banks[bank] ?? blankBank;
                  return <fieldset key={bank} className="min-w-0 space-y-3 rounded-xl border border-border p-3">
                    <legend className="px-1 text-sm font-medium">{bank}</legend>
                    <label className="grid gap-1 text-sm">Taux (%)<Input inputMode="decimal" maxLength={24} value={entry.rate} onChange={e => setBanks(current => ({ ...current, [bank]: { ...entry, rate: e.target.value } }))} /></label>
                    <label className="grid gap-1 text-sm">Prochaine réunion<Input type="date" value={entry.meeting} onChange={e => setBanks(current => ({ ...current, [bank]: { ...entry, meeting: e.target.value } }))} /></label>
                    <label className="grid gap-1 text-sm">Ton / biais<Input maxLength={120} value={entry.tone} onChange={e => setBanks(current => ({ ...current, [bank]: { ...entry, tone: e.target.value } }))} /></label>
                  </fieldset>;
                })}
              </div>
            ) : simpleFields.map(({ key, label, options, decimal, multiline }) => (
              <label key={key} className="grid gap-1 text-sm">
                {label}
                {options ? <select className={selectClass} value={values[key] ?? ''} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))}>
                  <option value="">Non renseigné</option>
                  {options.map(option => <option key={option}>{option}</option>)}
                </select> : multiline ? <Textarea maxLength={6000} value={values[key] ?? ''} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} />
                : <Input inputMode={decimal ? 'decimal' : undefined} maxLength={120} value={values[key] ?? ''} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} />}
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
