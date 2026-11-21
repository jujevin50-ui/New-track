import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BANKS, BLOCK_TITLES, type EditableBlockKey, type FundamentalBlocks, type WeekContext,
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

const fields: Partial<Record<EditableBlockKey | 'pair', Field[]>> = {
  regime: [{ key: 'regime', label: 'Régime', options: ['Risk-on', 'Risk-off'] }, { key: 'vix', label: 'VIX', decimal: true }],
  dollar: [{ key: 'dxy', label: 'DXY', decimal: true }, { key: 'us10y', label: 'US10Y (%)', decimal: true }, { key: 'fedBias', label: 'Biais Fed' }],
  week: [{ key: 'events', label: 'Événements majeurs', multiline: true }],
  pair: [{ key: 'bias', label: 'Biais', options: ['Haussier', 'Baissier', 'Neutre'] }, { key: 'differential', label: 'Différentiel de taux (points de %)', decimal: true }, { key: 'driver', label: 'Driver clé', multiline: true }],
  notes: [{ key: 'text', label: 'Notes et news clés', multiline: true }],
};

type SaveBlock = (block: EditableBlockKey, content: FundamentalBlocks[EditableBlockKey]) => Promise<void>;

interface EditorProps {
  block: EditableBlockKey;
  existing: WeekContext;
  onSave: SaveBlock;
  onClose: () => void;
}

export function ContextEditor({ block, existing, onSave, onClose }: EditorProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => block === 'banks' ? {} : { ...(existing[block] as Record<string, string> | undefined) },
  );
  const [banks, setBanks] = useState(() => existing.banks ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const simpleFields = fields[block] ?? fields.pair;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      const content = block === 'banks' ? banks : clean as FundamentalBlocks[EditableBlockKey];
      await onSave(block, content);
      onClose();
    } catch {
      setError('La sauvegarde a échoué. Tu peux réessayer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form aria-label={`Modifier ${BLOCK_TITLES[block]}`} onSubmit={submit} className="min-w-0 space-y-4">
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        {block === 'banks' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={saving}>Enregistrer</Button>
      </div>
    </form>
  );
}
