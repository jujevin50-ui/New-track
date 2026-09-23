import { useState, useEffect, useCallback } from 'react';
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
import { Star, Clipboard, X, Image as ImageIcon, Check, ChevronsUpDown, Sparkles, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const PairCombobox = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between bg-secondary border-border font-mono text-sm font-normal">
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
  onSubmit: (data: TradeFormData) => void;
  editTrade?: Trade | null;
  accounts: Account[];
  activeAccountId: string | null;
  asPanel?: boolean;
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
    commission: Number(raw.commission) || 0,
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

const AddTradeDialog = ({ open, onOpenChange, onSubmit, editTrade, accounts, activeAccountId, asPanel }: AddTradeDialogProps) => {
  const { apiKey } = useAiSettings();
  const [form, setForm] = useState<TradeFormData>(makeDefaultForm(activeAccountId || ''));
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
    if (editTrade) {
      const { id, tradeNumber, ...rest } = editTrade;
      const screenshots = rest.screenshots?.length ? rest.screenshots : rest.screenshot ? [rest.screenshot] : [];
      setForm({ ...rest, screenshots });
      setResultText(fmtNum(rest.result));
      setCommissionText(fmtNum(rest.commission));
      setSwapText(fmtNum(rest.swap));
      setRiskText(fmtNum(rest.riskPercent || 0));
    } else {
      setForm(makeDefaultForm(activeAccountId || ''));
      setResultText('');
      setCommissionText('');
      setSwapText('');
      setRiskText('');
    }
  }, [editTrade, open, activeAccountId]);

  const set = (field: keyof TradeFormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

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

  const net = form.result + form.commission + form.swap;
  const balance = accounts.find(a => a.id === form.accountId)?.initialBalance || 0;
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
- commission = commission affichée AVEC SON SIGNE. Si le screenshot affiche "-58", retourne -58, pas 58.
- swap = swap affiché AVEC SON SIGNE.
- Le total net est calculé par l'application comme: result + commission + swap.
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

      const trades = rows.map((row: AiTrade) => normalizeAiTrade(row, activeAccountId || ''));
      if (!trades.length) throw new Error('Aucun trade détecté.');
      setAiTrades(trades);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Erreur pendant l’analyse.');
    } finally {
      setAiLoading(false);
    }
  };

  const importAiTrades = () => {
    aiTrades.forEach(trade => onSubmit(trade));
    setAiOpen(false);
    resetAi();
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
          <div className="rounded-lg border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
            <b>Ctrl + V</b> pour coller chaque screenshot. Toutes les images sont analysées ensemble dans une seule requête Gemini.
          </div>

          <div
            tabIndex={0}
            className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/40 px-6 py-5 text-center outline-none hover:bg-secondary/70 focus:border-primary/60"
          >
            <Clipboard className="h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">Colle tes screenshots ici</div>
            <div className="text-xs text-muted-foreground">Fais une capture → Ctrl + C → Ctrl + V. Répète pour chaque trade.</div>
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

  const formBody = (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); onOpenChange(false); }} className="flex gap-6 h-full" onPaste={handlePasteEvent}>
      <div className="w-[340px] shrink-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Start Date</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="font-mono text-sm bg-secondary border-border" /></div>
          <div><Label className="text-xs text-muted-foreground">End Date</Label><Input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value)} className="font-mono text-sm bg-secondary border-border" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Pair</Label><PairCombobox value={form.pair} onChange={v => set('pair', v)} /></div>
          <div><Label className="text-xs text-muted-foreground">Account</Label><Select value={form.accountId} onValueChange={v => set('accountId', v)}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
        </div>

        <div><Label className="text-xs text-muted-foreground">Direction</Label><div className="flex gap-2 mt-1.5">{(['Buy','Sell'] as const).map(v => <button key={v} type="button" onClick={() => set('type',v)} className={`flex-1 px-4 py-1.5 rounded-md border text-xs font-medium ${form.type===v ? v==='Buy'?'bg-profit/15 border-profit/50 text-profit':'bg-loss/15 border-loss/50 text-loss':'bg-secondary border-border text-muted-foreground'}`}>{v==='Buy'?'↑ Long':'↓ Short'}</button>)}</div></div>

        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs text-muted-foreground">Profit ($)</Label><Input type="text" inputMode="decimal" value={resultText} onChange={decimalHandler('result',setResultText,true)} className="font-mono text-sm bg-secondary border-border" /></div>
          <div><Label className="text-xs text-muted-foreground">Comm.</Label><Input type="text" inputMode="decimal" value={commissionText} onChange={decimalHandler('commission',setCommissionText,true)} className="font-mono text-sm bg-secondary border-border" /></div>
          <div><Label className="text-xs text-muted-foreground">Swap</Label><Input type="text" inputMode="decimal" value={swapText} onChange={decimalHandler('swap',setSwapText,true)} className="font-mono text-sm bg-secondary border-border" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Risque (%)</Label><Input type="text" inputMode="decimal" value={riskText} onChange={decimalHandler('riskPercent',setRiskText,false)} placeholder="ex: 1" className="font-mono text-sm bg-secondary border-border" /></div>
          <div className="bg-card rounded-md border border-border p-3 flex justify-between items-center"><span className="text-xs text-muted-foreground">R</span><span className={`font-mono font-bold ${rValue===null?'text-muted-foreground':rValue>=0?'text-profit':'text-loss'}`}>{rValue===null?'—':`${rValue>=0?'+':''}${rValue.toFixed(2)}R`}</span></div>
        </div>

        <div><Label className="text-xs text-muted-foreground">Trade Exit</Label><Select value={form.exitType} onValueChange={v=>set('exitType',v as ExitType)}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent>{EXIT_TYPES.map(t=><SelectItem key={t} value={t}>{t==='Manual'?'Manual Close':t}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs text-muted-foreground">Setup Quality</Label><div className="flex gap-1 mt-1.5">{([1,2,3] as SetupQuality[]).map(q=><button key={q} type="button" onClick={()=>set('setupQuality',q)} className={`flex items-center gap-0.5 px-3 py-1.5 rounded-md border text-xs ${form.setupQuality===q?'bg-primary/20 border-primary/50 text-primary':'bg-secondary border-border text-muted-foreground'}`}>{Array.from({length:q}).map((_,i)=><Star key={i} className="h-3 w-3 fill-current"/>)}</button>)}</div></div>
        <div><Label className="text-xs text-muted-foreground">Strategy Respected</Label><div className="flex gap-2 mt-1.5">{[true,false].map(v=><button key={String(v)} type="button" onClick={()=>set('strategyRespected',v)} className={`px-4 py-1.5 rounded-md border text-xs ${form.strategyRespected===v?v?'bg-profit/15 border-profit/50 text-profit':'bg-loss/15 border-loss/50 text-loss':'bg-secondary border-border text-muted-foreground'}`}>{v?'Yes':'No'}</button>)}</div></div>
        <div className="bg-card rounded-md border border-border p-3 flex justify-between items-center"><span className="text-xs text-muted-foreground">Net Result</span><span className={`font-mono font-bold ${net>=0?'text-profit':'text-loss'}`}>{net>=0?'+':''}${net.toFixed(2)}</span></div>
      </div>

      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex-1 flex flex-col"><Label className="text-xs text-muted-foreground mb-1">Notes & Description</Label><Textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Describe the trade..." className="flex-1 bg-secondary border-border text-sm min-h-[200px] resize-none"/></div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><ImageIcon className="h-3 w-3"/>Images ({(form.screenshots||[]).length})</Label>
          {(form.screenshots||[]).length>0 && <div className="grid grid-cols-2 gap-2 mb-2">{(form.screenshots||[]).map((img,i)=><div key={i} className="relative rounded-md overflow-hidden border border-border group"><img src={img} alt={`Image ${i+1}`} className="w-full h-24 object-cover"/><Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-5 w-5 bg-background/80 opacity-0 group-hover:opacity-100" onClick={()=>removeImage(i)}><X className="h-3 w-3"/></Button></div>)}</div>}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 h-16 rounded-md border border-dashed border-border bg-secondary/50 cursor-pointer" onClick={() => navigator.clipboard.readText().catch(()=>{})} tabIndex={0}><div className="flex items-center gap-2"><Clipboard className="h-3.5 w-3.5 text-muted-foreground"/><span className="text-[11px] text-muted-foreground">Click then Ctrl+V</span></div></div>
            <Button type="button" variant="outline" onClick={()=>setAiOpen(true)}><Sparkles className="h-4 w-4 mr-2"/>Import IA</Button>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-border"><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button type="submit">{editTrade?'Update':'Add'}</Button></div>
      </div>
    </form>
  );

  if (asPanel) {
    return <><div className="h-full flex flex-col overflow-hidden bg-card text-foreground">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card"><div><h2 className="text-base font-semibold">{editTrade?'Edit Trade':'New Trade'}</h2>{editTrade&&<p className="text-xs text-muted-foreground mt-0.5">{editTrade.pair} · #{String(editTrade.tradeNumber).padStart(4,'0')}</p>}</div><button onClick={()=>onOpenChange(false)} className="p-1.5 rounded-md hover:bg-secondary"><X className="h-4 w-4 text-muted-foreground"/></button></div>
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-card">{formBody}</div>
    </div>{aiDialog}</>;
  }

  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editTrade?'Edit Trade':'Add Trade'}</DialogTitle></DialogHeader>{formBody}</DialogContent></Dialog>{aiDialog}</>;
};

export default AddTradeDialog;
