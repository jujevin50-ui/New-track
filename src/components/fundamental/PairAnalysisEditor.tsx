import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';
import type { AnalysisPair, PairAnalysis } from '@/lib/fundamentalContext';
import { readScreenshot, SCREENSHOT_ACCEPT } from '@/lib/screenshots';

interface Props {
  pair: AnalysisPair;
  analysis?: PairAnalysis;
  onSave: (analysis: Pick<PairAnalysis, 'note' | 'screenshot'>) => void;
  onClose: () => void;
}

export function PairAnalysisEditor({ pair, analysis, onSave, onClose }: Props) {
  const [note, setNote] = useState(analysis?.note ?? '');
  const [screenshot, setScreenshot] = useState(analysis?.screenshot);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const { saved, confirm } = useSaveConfirmation();

  const attach = async (file: File) => {
    if (reading || saved) return;
    setReading(true);
    setError('');
    try {
      setScreenshot(await readScreenshot(file));
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
    onSave({ note: note.trim(), screenshot });
  };

  return (
    <form aria-label={`Modifier l’analyse ${pair}`} onSubmit={submit} className="min-w-0 space-y-4" onPaste={event => {
      const image = Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/'))
        ?? Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile();
      if (!image) return;
      event.preventDefault();
      void attach(image);
    }}>
      <fieldset disabled={saved || reading} className="min-w-0 space-y-4">
        <label className="grid gap-1 text-sm">
          Note
          <Textarea value={note} maxLength={6000} onChange={event => setNote(event.target.value)} />
        </label>
        <div className="space-y-2">
          <label className="grid min-w-0 gap-1 text-sm">
            Capture d’écran
            <Input type="file" accept={SCREENSHOT_ACCEPT} className="h-auto min-w-0 py-2" onChange={event => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void attach(file);
            }} />
          </label>
          <p className="text-xs text-muted-foreground">Tu peux aussi coller une image dans le formulaire. 5 Mo maximum.</p>
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
