import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BANKS, BLOCK_TITLES, type EditableBlockKey, type FundamentalBlocks, type WeekContext,
} from '@/lib/fundamentalContext';

const selectClass = 'ui-select-trigger w-full rounded-[10px] border border-input bg-background px-3 text-sm';
const blankBank = { rate: '', meeting: '', tone: '' };
const bankBiasExamples = { Fed: 'Très hawkish', BCE: 'Neutre-hawkish', BoE: 'Hawkish', RBA: 'Hawkish' };

interface Field {
  key: string;
  label: string;
  options?: string[];
  decimal?: boolean;
  multiline?: boolean;
  placeholder?: string;
}

const fields: Record<Exclude<EditableBlockKey, 'banks'>, Field[]> = {
  regime: [{ key: 'regime', label: 'Régime', options: ['Risk-on', 'Risk-off'] }, { key: 'vix', label: 'VIX', decimal: true }],
  dollar: [
    { key: 'dxy', label: 'DXY', decimal: true },
    { key: 'us10y', label: 'US10Y (%)', decimal: true },
    { key: 'us2y', label: 'US2Y (%)', decimal: true },
    { key: 'fedBias', label: 'Biais Fed et anticipations du marché', multiline: true, placeholder: 'Ex. : Hawkish – le marché anticipe encore +25 à +50 pb d’ici mars' },
  ],
  week: [{ key: 'events', label: 'Événements majeurs', multiline: true }],
  bondSpreads: [
    { key: 'us10yDe10y', label: 'US10Y – DE10Y (pb)', decimal: true },
    { key: 'us2yDe2y', label: 'US2Y – DE2Y (pb)', decimal: true },
    { key: 'us10yUk10y', label: 'US10Y – UK10Y (pb)', decimal: true },
  ],
  inflation: [
    { key: 'usCorePce', label: 'US Core PCE – dernier (%)', decimal: true },
    { key: 'usCorePceForecast', label: 'US Core PCE – anticipé (%)', decimal: true },
    { key: 'euroCore', label: 'Zone euro – inflation sous-jacente (%)', decimal: true },
    { key: 'ukCore', label: 'Royaume-Uni – inflation sous-jacente (%)', decimal: true },
    { key: 'ukServices', label: 'Royaume-Uni – inflation des services (%)', decimal: true },
    { key: 'stickiest', label: 'Où l’inflation est-elle la plus persistante ?', multiline: true },
  ],
  cot: [
    { key: 'eurNet', label: 'EUR – position nette', decimal: true },
    { key: 'gbpNet', label: 'GBP – position nette', decimal: true },
    { key: 'dxyNet', label: 'USD Index – position nette', decimal: true },
    { key: 'comment', label: 'Commentaire sur le positionnement', multiline: true, placeholder: 'Ex. : EUR et GBP toujours fortement short → rebond potentiel si les shorts se rachètent, ou poursuite de la baisse si les ventes continuent.' },
  ],
  notes: [
    { key: 'drivers', label: '1. Drivers principaux', multiline: true },
    { key: 'dataToWatch', label: '2. Données à surveiller', multiline: true },
    { key: 'primaryScenario', label: '3. Scénario principal', multiline: true },
    { key: 'alternativeScenario', label: 'Scénario alternatif', multiline: true },
  ],
};

type SaveBlock = (block: EditableBlockKey, content: FundamentalBlocks[EditableBlockKey]) => void;
type BankFields = FundamentalBlocks['banks'];

interface EditorProps {
  block: EditableBlockKey;
  existing: WeekContext;
  onSave: SaveBlock;
  onClose: () => void;
  bankReport?: {
    canCopy: (banks: BankFields) => boolean;
    copy: (banks: BankFields) => void;
    openNextWeek: () => void;
  };
}

export function ContextEditor({ block, existing, onSave, onClose, bankReport }: EditorProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (block === 'banks') return {};
    if (block === 'notes') {
      const { text, ...notes } = existing.notes ?? {};
      return { ...notes, drivers: notes.drivers ?? text ?? '' };
    }
    return { ...existing[block] };
  });
  const [banks, setBanks] = useState(() => existing.banks ?? {});
  const [reporting, setReporting] = useState(false);
  const { saved, confirm } = useSaveConfirmation();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saved) return;
    const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    const content = block === 'banks' ? banks : clean as FundamentalBlocks[EditableBlockKey];
    confirm(onClose);
    onSave(block, content);
  };

  const report = () => {
    if (!bankReport?.canCopy(banks) || saved) return;
    setReporting(true);
    confirm(bankReport.openNextWeek);
    bankReport.copy(banks);
  };

  return (
    <form aria-label={`Modifier ${BLOCK_TITLES[block]}`} onSubmit={submit} className="min-w-0 space-y-4">
      <fieldset disabled={saved} className="min-w-0 space-y-4">
        {block === 'banks' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {BANKS.map(bank => {
              const entry = banks[bank] ?? blankBank;
              return <fieldset key={bank} className="min-w-0 space-y-3 rounded-xl border border-border p-3">
                <legend className="px-1 text-sm font-medium">{bank}</legend>
                <label className="grid gap-1 text-sm">Taux (%)<Input inputMode="decimal" maxLength={24} value={entry.rate} onChange={e => setBanks(current => ({ ...current, [bank]: { ...entry, rate: e.target.value } }))} /></label>
                <label className="grid gap-1 text-sm">Prochaine réunion<Input type="date" value={entry.meeting} onChange={e => setBanks(current => ({ ...current, [bank]: { ...entry, meeting: e.target.value } }))} /></label>
                <label className="grid gap-1 text-sm">Biais relatif<Input placeholder={`Ex. : ${bankBiasExamples[bank]}`} maxLength={120} value={entry.tone} onChange={e => setBanks(current => ({ ...current, [bank]: { ...entry, tone: e.target.value } }))} /></label>
              </fieldset>;
            })}
          </div>
        ) : fields[block].map(({ key, label, options, decimal, multiline, placeholder }) => (
          <label key={key} className="grid gap-1 text-sm">
            {label}
            {options ? <select className={selectClass} value={values[key] ?? ''} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))}>
              <option value="">Non renseigné</option>
              {options.map(option => <option key={option}>{option}</option>)}
            </select> : multiline ? <Textarea placeholder={placeholder} maxLength={6000} value={values[key] ?? ''} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} />
            : <Input inputMode={decimal ? 'decimal' : undefined} maxLength={120} value={values[key] ?? ''} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} />}
          </label>
        ))}
      </fieldset>
      <div className="ui-form-footer flex flex-wrap justify-end gap-2">
        {bankReport && (
          <Button type="button" variant="outline" className="h-auto whitespace-normal" onClick={report}
            saved={saved && reporting} disabled={saved || !bankReport.canCopy(banks)}>
            {saved && reporting ? 'Pris en compte' : 'Reporter à la semaine suivante'}
          </Button>
        )}
        <Button type="button" variant="outline" disabled={saved} onClick={onClose}>Annuler</Button>
        <Button type="submit" saved={saved && !reporting} disabled={saved}>
          {saved && !reporting ? 'Pris en compte' : <><Save aria-hidden="true" />Enregistrer</>}
        </Button>
      </div>
    </form>
  );
}
