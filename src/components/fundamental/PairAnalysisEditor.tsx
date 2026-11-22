import { useState, type FormEvent } from 'react';
import { Clipboard, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';
import type { AnalysisPair, PairAnalysis } from '@/lib/fundamentalContext';
import { pastedImage, readClipboardImage, readScreenshot } from '@/lib/screenshots';

interface Props {
  pair: AnalysisPair;
  analysis?: PairAnalysis;
  onSave: (analysis: Pick<PairAnalysis, 'note' | 'screenshot' | 'bias'>) => void;
  onClose: () => void;
}

export function PairAnalysisEditor({ pair, analysis, onSave, onClose }: Props) {
  const [note, setNote] = useState(analysis?.note ?? '');
  const [bias, setBias] = useState(analysis?.bias ?? '');
  const [screenshot, setScreenshot] = useState(analysis?.screenshot);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const { saved, confirm } = useSaveConfirmation();

  const attach = async (getFile: () => Promise<File>) => {
    if (reading || saved) return;
    setReading(true);
    setError('');
    try {
      setScreenshot(await readScreenshot(await getFile()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de lire la capture.');
    } finally {
      setReading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reading || saved) return;
    confirm(onClose);
    onSave({ note: note.trim(), screenshot, bias });
  };

  return (
    <form aria-label={`Modifier l’analyse ${pair}`} onSubmit={submit} className="min-w-0 space-y-4" onPaste={event => {
      const image = pastedImage(event.clipboardData);
      if (!image) return;
      event.preventDefault();
      void attach(async () => image);
    }}>
      <fieldset disabled={saved || reading} className="min-w-0 space-y-4">
        <label className="grid gap-1 text-sm">
          Biais
          <select value={bias} onChange={event => setBias(event.target.value as typeof bias)} className="ui-select-trigger w-full rounded-[10px] border border-input bg-background px-3 text-sm">
            <option value="">Non renseigné</option>
            <option>Haussier</option>
            <option>Baissier</option>
            {analysis?.bias === 'Neutre' && <option>Neutre</option>}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Note
          <Textarea value={note} maxLength={6000} onChange={event => setNote(event.target.value)} />
        </label>
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" loading={reading} onClick={() => void attach(() => readClipboardImage(`analyse-${pair}`))}>
            {!reading && <Clipboard aria-hidden="true" />}Coller l’image
          </Button>
          {screenshot && (
            <div className="flex flex-wrap items-center gap-2">
              <img src={screenshot.content} alt={screenshot.name} className="max-h-28 max-w-full rounded-md border border-border object-contain" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setScreenshot(undefined)}>Retirer la capture</Button>
            </div>
          )}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="ui-form-footer flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={saved || reading} onClick={onClose}>Annuler</Button>
        <Button type="submit" saved={saved} disabled={saved || reading}>
          {saved ? 'Pris en compte' : <><Save aria-hidden="true" />Enregistrer</>}
        </Button>
      </div>
    </form>
  );
}
