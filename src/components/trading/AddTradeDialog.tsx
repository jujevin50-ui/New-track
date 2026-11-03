import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { Trade, TradeFormData, PAIRS, EXIT_TYPES, ExitType, SetupQuality } from '@/types/trade';
import { Account } from '@/types/account';
import { useAiSettings } from '@/hooks/useAiSettings';
import { askGeminiWithImages } from '@/lib/geminiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Clipboard, X, ImagePlus, Check, ChevronsUpDown, Sparkles, Loader2, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const PairCombobox = ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="h-11 w-full justify-between rounded-xl bg-secondary/50 border-border/60 font-mono text-sm font-medium">
          {value || 'Choisir...'}<ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher..." className="text-sm" />
          <CommandList>
            <CommandEmpty className="text-xs text-muted-foreground py-4">Aucune paire trouvée.</CommandEmpty>
            <CommandGroup>
              {PAIRS.map(p => (
                <CommandItem key={p} value={p} onSelect={v => {
                  const match = PAIRS.find(pair => pair.toLowerCase() === v.toLowerCase());
                  if (match) onChange(match);
                  setOpen(false);
                }} className="font-mono text-sm">
                  <Check className={`mr-2 h-3.5 w-3.5 ${value === p ? 'opacity-100' : 'opacity-0'}`} />{p}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface AddTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TradeFormData) => void | Promise<void>;
  editTrade?: Trade | null;
  accounts: Account[];
  activeAccountId: string | null;
}

type AiTrade = Partial<TradeFormData> & { pair?: string; type?: 'Buy' | 'Sell' };

const makeDefaultForm = (accountId: string): TradeFormData => ({
  date: new Date().toISOString().slice(0, 10),
  endDate: '',
  pair: 'EURUSD',
  type: 'Buy',
  result: 0,
  commission: 0,
  swap: 0,
  exitType: 'TP',
  setupQuality: 2,
  strategyRespected: true,
  riskPercent: 0,
  notes: '',
  screenshots: [],
  accountId,
});

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const compressImage = async (file: File): Promise<{ mimeType: string; data: string }> => {
  const dataUrl = await fileToDataUrl(file);
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL('image/jpeg', 0.82);
  return { mimeType: 'image/jpeg', data: compressed.split(',')[1] };
};

const normalizeAiTrade = (raw: AiTrade, accountId: string): TradeFormData => {
  const pairValue = String(raw.pair || '').toUpperCase();
  const pair = (PAIRS as readonly string[]).includes(pairValue) ? pairValue : 'EURUSD';
  const type = raw.type === 'Sell' ? 'Sell' : 'Buy';
  const exitType: ExitType = EXIT_TYPES.includes(raw.exitType as ExitType) ? raw.exitType as ExitType : 'TP';
  const setupQuality: SetupQuality = raw.setupQuality === 1 || raw.setupQuality === 3 ? raw.setupQuality : 2;

  return {
    date: String(raw.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
    endDate: raw.endDate ? String(raw.endDate).slice(0, 10) : '',
    pair,
    type,
    result: Number(raw.result) || 0,
    commission: Math.abs(Number(raw.commission) || 0),
    swap: Number(raw.swap) || 0,
    exitType,
    setupQuality,
    strategyRespected: raw.strategyRespected !== false,
    riskPercent: Number(raw.riskPercent) || 0,
    notes: String(raw.notes || ''),
    screenshots: [],
    accountId,
  };
};

const AddTradeDialog = ({ open, onOpenChange, onSubmit, editTrade, accounts, activeAccountId }: AddTradeDialogProps) => {
  const { apiKey } = useAiSettings();
  const fieldId = useId();
  const imageInput = useRef<HTMLInputElement>(null);
  const defaultAccountId = accounts.find(a => a.id === activeAccountId)?.id || accounts[0]?.id || '';
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageError, setImageError] = useState('');
  const [feesOpen, setFeesOpen] = useState(false);
  const [form, setForm] = useState<TradeFormData>(makeDefaultForm(defaultAccountId));
  const [resultText, setResultText] = useState('');
  const [commissionText, setCommissionText] = useState('');
  const [swapText, setSwapText] = useState('');
  const [riskText, setRiskText] = useState('');

  const [aiOpen, setAiOpen] = useState(false);
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiTrades, setAiTrades] = useState<TradeFormData[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const fmtNum = (n: number) => n === 0 ? '' : String(n);

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setImageError('');
    if (editTrade) {
      const { id, tradeNumber, ...rest } = editTrade;
      const screenshots = rest.screenshots?.length ? rest.screenshots : rest.screenshot ? [rest.screenshot] : [];
      setForm({ ...rest, commission: Math.abs(rest.commission || 0), screenshot: undefined, screenshots });
      setResultText(String(rest.result));
      setFeesOpen(Boolean(rest.commission || rest.swap));
      setCommissionText(fmtNum(Math.abs(rest.commission || 0)));
      setSwapText(fmtNum(rest.swap));
      setRiskText(fmtNum(rest.riskPercent || 0));
    } else {
      setForm(makeDefaultForm(defaultAccountId));
      setFeesOpen(false);
      setResultText('');
      setCommissionText('');
      setSwapText('');
      setRiskText('');
    }
  }, [editTrade, open, defaultAccountId]);

  const set = <K extends keyof TradeFormData>(field: K, value: TradeFormData[K]) => {
    setFormError('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const decimalHandler = (
    field: 'result' | 'commission' | 'swap' | 'riskPercent',
    setText: (s: string) => void,
    allowNegative: boolean
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const pattern = allowNegative ? /^-?\d*[.,]?\d*$/ : /^\d*[.,]?\d*$/;
    if (!pattern.test(raw)) return;
    setText(raw);
    set(field, parseFloat(raw.replace(',', '.')) || 0);
  };

  const addImage = useCallback((dataUrl: string) =>
    setForm(prev => ({ ...prev, screenshots: [...(prev.screenshots || []), dataUrl] })), []);

  const removeImage = useCallback((index: number) =>
    setForm(prev => ({ ...prev, screenshots: (prev.screenshots || []).filter((_, i) => i !== index) })), []);

  const handlePasteEvent = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].type.startsWith('image/')) continue;
      const file = items[i].getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = () => addImage(reader.result as string);
      reader.readAsDataURL(file);
      e.preventDefault();
      return;
    }
  }, [addImage]);

  const handleAiPasteEvent = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].type.startsWith('image/')) continue;
      const blob = items[i].getAsFile();
      if (!blob) continue;
      const file = new File([blob], `trade-${Date.now()}-${i}.png`, { type: blob.type || 'image/png' });
      setAiFiles(prev => [...prev, file]);
      setAiTrades([]);
      setAiError('');
      e.preventDefault();
      return;
    }
  }, []);

  const net = form.result - Math.abs(form.commission || 0) + (form.swap || 0);
  const selectedAccount = accounts.find(a => a.id === form.accountId);
  const balance = selectedAccount?.initialBalance || 0;
  const currency = selectedAccount?.currency || 'USD';
  const money = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Object.is(value, -0) ? 0 : value);
  const rValue = form.riskPercent && form.riskPercent > 0 && balance > 0
    ? net / (balance * (form.riskPercent / 100))
    : null;

  const resetAi = () => {
    setAiFiles([]);
    setAiTrades([]);
    setAiError('');
    setAiLoading(false);
  };

  const analyzeAiFiles = async () => {
    if (!apiKey) {
      setAiError('Aucune clé Gemini configurée. Configure la clé dans Assistant IA.');
      return;
    }
    if (!aiFiles.length) {
      setAiError('Colle au moins une capture avec Ctrl + V.');
      return;
    }

    setAiLoading(true);
    setAiError('');
    try {
      const images = await Promise.all(aiFiles.map(compressImage));

      const system = `Tu es l'assistant d'import de trades de l'application New-track.
Analyse chaque capture d'écran comme un trade distinct, dans l'ordre des images.
Retourne UNIQUEMENT un JSON valide sous la forme:
{"trades":[{"date":"YYYY-MM-DD","endDate":"","pair":"EURUSD","type":"Buy","result":0,"commission":0,"swap":0,"exitType":"TP","setupQuality":2,"strategyRespected":true,"riskPercent":0,"notes":""}]}

Règles:
- Ne devine jamais une valeur illisible.
- "Short" = type "Sell"; "Long" = type "Buy".
- result = Profit BRUT affiché.
- commission = le montant de la commission. Retourne sa valeur absolue : si le screenshot affiche "-58", retourne 58.
- swap = swap affiché AVEC SON SIGNE.
- Le total net est calculé par l'application comme: result - abs(commission) + swap.
- Respecte les nombres décimaux et les virgules françaises.
- IMPORTANT POUR NOTES: cherche attentivement partout dans le screenshot une note personnelle, annotation, commentaire, texte libre, remarque ou description écrite par l'utilisateur.
- Recopie cette note dans "notes" LE PLUS FIDÈLEMENT POSSIBLE, sans la résumer ni l'interpréter.
- Conserve les mots, chiffres, signes, accents et informations visibles.
- Si plusieurs zones de notes personnelles sont visibles, rassemble-les dans "notes" dans un ordre logique.
- Si aucune note personnelle/libre n'est visible, retourne "notes": "".
- Chaque image correspond exactement à un trade.`;

      const prompt = `Voici ${images.length} capture(s). Extrais les informations de chaque trade.
Image 1 = trade 1, image 2 = trade 2, etc.
Pour chaque trade, récupère aussi la note écrite directement sur le screenshot si elle existe.`;

      const text = await askGeminiWithImages(apiKey, system, prompt, images);
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      const rows = Array.isArray(parsed) ? parsed : parsed.trades;
      if (!Array.isArray(rows)) throw new Error('Format de réponse IA invalide.');

      const trades = rows.map((row: AiTrade) => normalizeAiTrade(row, form.accountId));
      if (!trades.length) throw new Error('Aucun trade détecté.');
      setAiTrades(trades);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Erreur pendant l’analyse.');
    } finally {
      setAiLoading(false);
    }
  };

  const importAiTrades = async () => {
    setAiLoading(true);
    try {
      for (const trade of aiTrades) await onSubmit(trade);
      setAiOpen(false);
      resetAi();
      onOpenChange(false);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Impossible d’importer les trades.');
    } finally {
      setAiLoading(false);
    }
  };

  const aiDialog = (
    <Dialog open={aiOpen} onOpenChange={v => { setAiOpen(v); if (!v) resetAi(); }}>
      <DialogContent onPaste={handleAiPasteEvent} className="sm:max-w-6xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Import IA de plusieurs trades
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            tabIndex={0}
            className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/40 px-6 py-5 text-center outline-none hover:bg-secondary/70 focus:border-primary/60"
          >
            <Clipboard className="h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">Colle tes screenshots ici</div>
            <kbd className="text-xs text-muted-foreground">Ctrl + V</kbd>
            <span className="text-xs font-medium text-primary">{aiFiles.length} capture(s) prête(s)</span>
          </div>

          {aiFiles.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {aiFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative border border-border rounded overflow-hidden bg-secondary">
                  <img src={URL.createObjectURL(file)} alt={`Capture ${i + 1}`} className="w-full h-20 object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-[9px] px-1 truncate">{i + 1}. {file.name}</div>
                </div>
              ))}
            </div>
          )}

          {aiError && <div className="rounded-md border border-loss/40 bg-loss/10 text-loss p-3 text-xs">{aiError}</div>}

          {aiTrades.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">{aiTrades.length} trade(s) détecté(s) — vérifie avant import</div>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-2">#</th><th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Paire</th><th className="text-left p-2">Direction</th>
                      <th className="text-right p-2">Profit</th><th className="text-right p-2">Comm.</th>
                      <th className="text-right p-2">Swap</th><th className="text-right p-2">Risque</th>
                      <th className="text-left p-2">Sortie</th><th className="text-left p-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiTrades.map((t, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2"><Input type="date" value={t.date} onChange={e => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,date:e.target.value} : x))} className="h-7 text-xs bg-secondary" /></td>
                        <td className="p-2"><Input value={t.pair} onChange={e => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,pair:e.target.value.toUpperCase()} : x))} className="h-7 text-xs bg-secondary font-mono w-24" /></td>
                        <td className="p-2"><Select value={t.type} onValueChange={v => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,type:v as 'Buy'|'Sell'} : x))}><SelectTrigger className="h-7 w-24 text-xs bg-secondary"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Buy">Long</SelectItem><SelectItem value="Sell">Short</SelectItem></SelectContent></Select></td>
                        <td className="p-2"><Input type="number" value={t.result} onChange={e => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,result:Number(e.target.value)||0} : x))} className="h-7 text-xs bg-secondary w-24" /></td>
                        <td className="p-2"><Input type="number" value={t.commission} onChange={e => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,commission:Number(e.target.value)||0} : x))} className="h-7 text-xs bg-secondary w-24" /></td>
                        <td className="p-2"><Input type="number" value={t.swap} onChange={e => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,swap:Number(e.target.value)||0} : x))} className="h-7 text-xs bg-secondary w-24" /></td>
                        <td className="p-2"><Input type="number" value={t.riskPercent} onChange={e => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,riskPercent:Number(e.target.value)||0} : x))} className="h-7 text-xs bg-secondary w-20" /></td>
                        <td className="p-2"><Select value={t.exitType} onValueChange={v => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,exitType:v as ExitType} : x))}><SelectTrigger className="h-7 w-24 text-xs bg-secondary"><SelectValue /></SelectTrigger><SelectContent>{EXIT_TYPES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></td>
                        <td className="p-2 min-w-[220px]"><Textarea value={t.notes || ''} onChange={e => setAiTrades(prev => prev.map((x,j) => j===i ? {...x,notes:e.target.value} : x))} className="min-h-16 text-xs bg-secondary" placeholder="Note détectée..." /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => { setAiOpen(false); resetAi(); }}>Annuler</Button>
            <Button variant="outline" onClick={analyzeAiFiles} disabled={aiLoading || !aiFiles.length}>
              {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyse...</> : <><Sparkles className="h-4 w-4 mr-2" />Analyser</>}
            </Button>
            <Button onClick={importAiTrades} disabled={!aiTrades.length || aiLoading}>Importer {aiTrades.length || ''} trade(s)</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setImageError('');
    const images = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (images.length !== files.length) setImageError('Choisissez des fichiers image.');
    try {
      const urls = await Promise.all(images.map(fileToDataUrl));
      setForm(prev => ({ ...prev, screenshots: [...(prev.screenshots || []), ...urls] }));
    } catch {
      setImageError('Impossible de lire cette image.');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!selectedAccount) { setFormError('Sélectionnez un compte.'); return; }
    if (form.endDate && form.endDate < form.date) { setFormError('La clôture doit suivre la date d’ouverture.'); return; }
    if ((form.riskPercent || 0) > 100) { setFormError('Le risque ne peut pas dépasser 100 %.'); return; }
    if (![form.result, form.commission, form.swap, form.riskPercent || 0].every(Number.isFinite)) {
      setFormError('Vérifiez les montants saisis.'); return;
    }
    setFormError('');
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d’enregistrer le trade.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'h-11 rounded-xl bg-secondary/50 border-border/60 font-mono text-sm';
  const screenshots = form.screenshots || [];
  const signedDecimal = '-?[0-9]+([.,][0-9]+)?';
  const decimal = '[0-9]+([.,][0-9]+)?';

  return (
    <>
      <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
        <DialogContent aria-describedby={undefined} className="trade-editor flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-[960px] flex-col gap-0 overflow-hidden rounded-3xl border-border/60 bg-card p-0 sm:rounded-3xl">
          <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 px-5 py-5 pr-12 sm:px-7 sm:pr-14 text-left">
            <DialogTitle className="text-xl tracking-tight">{editTrade ? 'Modifier le trade' : 'Nouveau trade'}</DialogTitle>
            {!editTrade && <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 rounded-full text-muted-foreground" onClick={() => setAiOpen(true)}><Sparkles className="h-3.5 w-3.5" />Import IA</Button>}
          </DialogHeader>
          <form onSubmit={handleSubmit} onPaste={handlePasteEvent} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <fieldset disabled={saving} className="grid min-w-0 gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_230px] md:gap-8">
                <div className="min-w-0 space-y-6">
                  <section aria-labelledby={`${fieldId}-position`} className="space-y-4">
                    <h3 id={`${fieldId}-position`} className="text-sm font-semibold">Position</h3>
                    <div className="space-y-2">
                      <Label htmlFor={`${fieldId}-account`}>Compte</Label>
                      <Select value={form.accountId} onValueChange={v => set('accountId', v)}>
                        <SelectTrigger id={`${fieldId}-account`} className={inputClass}><SelectValue placeholder="Choisir un compte" /></SelectTrigger>
                        <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor={`${fieldId}-pair`}>Paire</Label><PairCombobox id={`${fieldId}-pair`} value={form.pair} onChange={v => set('pair', v)} /></div>
                      <div className="space-y-2">
                        <Label id={`${fieldId}-direction`}>Direction</Label>
                        <div role="group" aria-labelledby={`${fieldId}-direction`} className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
                          {(['Buy', 'Sell'] as const).map(type => (
                            <button key={type} type="button" aria-pressed={form.type === type} onClick={() => set('type', type)} className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${form.type === type ? type === 'Buy' ? 'bg-profit/15 text-profit shadow-sm' : 'bg-loss/15 text-loss shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                              {type === 'Buy' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{type === 'Buy' ? 'Long' : 'Short'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor={`${fieldId}-date`}>Ouverture</Label><Input id={`${fieldId}-date`} type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={`${inputClass} block min-w-0 w-full`} /></div>
                      <div className="space-y-2"><Label htmlFor={`${fieldId}-end`}>Clôture</Label><Input id={`${fieldId}-end`} type="date" min={form.date} value={form.endDate || ''} onChange={e => set('endDate', e.target.value)} className={`${inputClass} block min-w-0 w-full`} /></div>
                    </div>
                  </section>

                  <section aria-labelledby={`${fieldId}-result-section`} className="space-y-4 border-t border-border/60 pt-5">
                    <h3 id={`${fieldId}-result-section`} className="text-sm font-semibold">Résultat</h3>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] gap-4">
                      <div className="space-y-2"><Label htmlFor={`${fieldId}-result`}>P&amp;L brut ({currency})</Label><Input id={`${fieldId}-result`} type="text" inputMode="decimal" pattern={signedDecimal} required placeholder="0,00" value={resultText} onChange={decimalHandler('result', setResultText, true)} className={`${inputClass} h-12 text-lg font-semibold`} /></div>
                      <div className="space-y-2"><Label htmlFor={`${fieldId}-risk`}>Risque (%)</Label><Input id={`${fieldId}-risk`} type="text" inputMode="decimal" pattern={decimal} placeholder="0" value={riskText} onChange={decimalHandler('riskPercent', setRiskText, false)} className={`${inputClass} h-12`} /></div>
                    </div>
                    <details open={feesOpen} onToggle={e => setFeesOpen(e.currentTarget.open)} className="group rounded-xl border border-border/60 px-3.5">
                      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden"><span>Commission &amp; swap</span><ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary>
                      <div className="grid grid-cols-2 gap-3 pb-4">
                        <div className="space-y-2"><Label htmlFor={`${fieldId}-commission`}>Commission ({currency})</Label><Input id={`${fieldId}-commission`} type="text" inputMode="decimal" pattern={decimal} value={commissionText} placeholder="0,00" onChange={decimalHandler('commission', setCommissionText, false)} className={inputClass} /></div>
                        <div className="space-y-2"><Label htmlFor={`${fieldId}-swap`}>Swap ({currency})</Label><Input id={`${fieldId}-swap`} type="text" inputMode="decimal" pattern={signedDecimal} value={swapText} placeholder="0,00" onChange={decimalHandler('swap', setSwapText, true)} className={inputClass} /></div>
                      </div>
                    </details>
                    <div className="space-y-2">
                      <Label id={`${fieldId}-exit`}>Sortie</Label>
                      <div role="group" aria-labelledby={`${fieldId}-exit`} className="flex flex-wrap gap-1.5">
                        {EXIT_TYPES.map(exit => <button key={exit} type="button" aria-pressed={form.exitType === exit} onClick={() => set('exitType', exit)} className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${form.exitType === exit ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:bg-secondary'}`}>{exit === 'Manual' ? 'Manuelle' : exit === 'Trail' ? 'Trailing' : exit}</button>)}
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby={`${fieldId}-journal`} className="space-y-4 border-t border-border/60 pt-5">
                    <h3 id={`${fieldId}-journal`} className="text-sm font-semibold">Journal</h3>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Label id={`${fieldId}-quality`}>Qualité du setup</Label>
                        <div role="group" aria-labelledby={`${fieldId}-quality`} className="flex gap-1.5">
                          {([1, 2, 3] as SetupQuality[]).map(quality => <button key={quality} type="button" aria-label={`${quality} étoile${quality > 1 ? 's' : ''}`} aria-pressed={form.setupQuality === quality} onClick={() => set('setupQuality', quality)} className={`flex h-9 items-center gap-0.5 rounded-lg border px-2.5 transition-colors ${form.setupQuality === quality ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:bg-secondary'}`}>{Array.from({ length: quality }, (_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</button>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3"><Label htmlFor={`${fieldId}-strategy`}>Plan respecté</Label><Switch id={`${fieldId}-strategy`} checked={form.strategyRespected} onCheckedChange={v => set('strategyRespected', v)} /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor={`${fieldId}-notes`}>Notes</Label><Textarea id={`${fieldId}-notes`} value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="min-h-24 resize-y rounded-xl border-border/60 bg-secondary/50 text-sm" /></div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Captures{screenshots.length > 0 ? ` · ${screenshots.length}` : ''}</Label>
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => imageInput.current?.click()}><ImagePlus className="h-3.5 w-3.5" />Ajouter</Button>
                      </div>
                      <input ref={imageInput} type="file" accept="image/*" multiple aria-label="Ajouter des captures" className="sr-only" tabIndex={-1} onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
                      {screenshots.length > 0 ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{screenshots.map((img, i) => <div key={i} className="group relative overflow-hidden rounded-xl border border-border/60"><img src={img} alt={`Capture ${i + 1}`} className="h-24 w-full object-cover" /><Button type="button" variant="secondary" size="icon" aria-label={`Supprimer la capture ${i + 1}`} className="absolute right-1 top-1 h-7 w-7 rounded-full" onClick={() => removeImage(i)}><X className="h-3.5 w-3.5" /></Button></div>)}</div> : <button type="button" onClick={() => imageInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-5 text-xs text-muted-foreground transition-colors hover:bg-secondary/50"><Clipboard className="h-4 w-4" />Importer ou coller une capture</button>}
                      {imageError && <p role="alert" className="text-sm text-loss">{imageError}</p>}
                    </div>
                  </section>
                </div>

                <aside aria-label="Récapitulatif du trade" className="self-start rounded-2xl border border-border/60 bg-secondary/40 p-5 md:sticky md:top-0">
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-lg font-semibold">{form.pair}</span><span className={`rounded-full px-2 py-1 text-xs font-medium ${form.type === 'Buy' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>{form.type === 'Buy' ? 'Long' : 'Short'}</span></div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{selectedAccount?.name || 'Choisir un compte'}</p>
                  <div className="my-5 border-t border-border/60" />
                  <div role="status" aria-live="polite" aria-atomic="true">
                    <p className="text-xs font-medium text-muted-foreground">Résultat net</p>
                    <p className={`mt-2 break-words font-mono text-2xl font-semibold tracking-tight ${net === 0 ? 'text-foreground' : net > 0 ? 'text-profit' : 'text-loss'}`}>{net > 0 ? '+' : ''}{money(net)}</p>
                    <dl className="mt-5 space-y-3 text-xs">
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">P&amp;L brut</dt><dd className="font-mono">{money(form.result)}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Commission</dt><dd className="font-mono">{money(-Math.abs(form.commission))}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Swap</dt><dd className="font-mono">{money(form.swap)}</dd></div>
                      <div className="flex justify-between gap-2 border-t border-border/60 pt-3"><dt className="text-muted-foreground">R-multiple</dt><dd className="font-mono font-semibold">{rValue === null ? '—' : `${rValue > 0 ? '+' : ''}${rValue.toFixed(2)}R`}</dd></div>
                    </dl>
                  </div>
                </aside>
              </fieldset>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border/60 bg-background/80 px-5 py-4 sm:px-7">
              {formError && <p role="alert" className="w-full text-sm text-loss">{formError}</p>}
              <Button type="button" variant="ghost" disabled={saving} className="rounded-xl" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={saving || !accounts.length} className="gap-2 rounded-xl px-5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editTrade ? 'Enregistrer' : 'Ajouter le trade'}</Button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      {aiDialog}
    </>
  );
};

export default AddTradeDialog;
