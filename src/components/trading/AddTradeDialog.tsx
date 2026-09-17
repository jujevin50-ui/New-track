import { useState, useEffect, useCallback } from 'react';
import { Trade, TradeFormData, PAIRS, EXIT_TYPES, ExitType, SetupQuality } from '@/types/trade';
import { Account } from '@/types/account';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Star, Clipboard, X, Image as ImageIcon, Check, ChevronsUpDown } from 'lucide-react';

const PairCombobox = ({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between bg-secondary border-border font-mono text-sm font-normal ${className ?? ''}`}
        >
          {value || 'Choisir...'}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher..." className="text-sm" />
          <CommandList>
            <CommandEmpty className="text-xs text-muted-foreground py-4">Aucune paire trouvée.</CommandEmpty>
            <CommandGroup>
              {PAIRS.map(p => (
                <CommandItem
                  key={p}
                  value={p}
                  onSelect={v => {
                    const match = PAIRS.find(pair => pair.toLowerCase() === v.toLowerCase());
                    if (match) onChange(match);
                    setOpen(false);
                  }}
                  className="font-mono text-sm"
                >
                  <Check className={`mr-2 h-3.5 w-3.5 ${value === p ? 'opacity-100' : 'opacity-0'}`} />
                  {p}
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

const AddTradeDialog = ({ open, onOpenChange, onSubmit, editTrade, accounts, activeAccountId, asPanel }: AddTradeDialogProps) => {
  const defaultForm: TradeFormData = {
    date: new Date().toISOString().split('T')[0],
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
    accountId: activeAccountId || '',
  };

  const [form, setForm] = useState<TradeFormData>(defaultForm);

  const fmtNum = (n: number) => (n === 0 ? '' : String(n));
  const [resultText, setResultText] = useState('');
  const [commissionText, setCommissionText] = useState('');
  const [swapText, setSwapText] = useState('');
  const [riskText, setRiskText] = useState('');

  useEffect(() => {
    if (editTrade) {
      const { id, tradeNumber, ...rest } = editTrade;
      // Migrate single screenshot to array
      const screenshots = rest.screenshots && rest.screenshots.length > 0
        ? rest.screenshots
        : rest.screenshot ? [rest.screenshot] : [];
      setForm({ ...rest, screenshots });
      setResultText(fmtNum(rest.result));
      setCommissionText(fmtNum(rest.commission));
      setSwapText(fmtNum(rest.swap));
      setRiskText(fmtNum(rest.riskPercent || 0));
    } else {
      setForm({ ...defaultForm, accountId: activeAccountId || '' });
      setResultText('');
      setCommissionText('');
      setSwapText('');
      setRiskText('');
    }
  }, [editTrade, open, activeAccountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onOpenChange(false);
  };

  const set = (field: keyof TradeFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Accept "." or "," as decimal separator while typing, store the numeric value with a "."
  const decimalHandler = (field: 'result' | 'commission' | 'swap' | 'riskPercent', setText: (s: string) => void, allowNegative: boolean) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const pattern = allowNegative ? /^-?\d*[.,]?\d*$/ : /^\d*[.,]?\d*$/;
      if (!pattern.test(raw)) return;
      setText(raw);
      set(field, parseFloat(raw.replace(',', '.')) || 0);
    };

  const addImage = useCallback((dataUrl: string) => {
    setForm(prev => ({
      ...prev,
      screenshots: [...(prev.screenshots || []), dataUrl],
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      screenshots: (prev.screenshots || []).filter((_, i) => i !== index),
    }));
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => addImage(reader.result as string);
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch {}
  }, [addImage]);

  const handlePasteEvent = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => addImage(reader.result as string);
          reader.readAsDataURL(file);
        }
        e.preventDefault();
        return;
      }
    }
  }, [addImage]);

  const net = form.result - form.commission - form.swap;
  const screenshots = form.screenshots || [];
  const accountBalance = accounts.find(a => a.id === form.accountId)?.initialBalance || 0;
  const rValue = form.riskPercent && form.riskPercent > 0 && accountBalance > 0
    ? net / (accountBalance * (form.riskPercent / 100))
    : null;

  const formBody = (
    <form onSubmit={handleSubmit} className="flex gap-6 h-full" onPaste={handlePasteEvent}>
          {/* Left side - Form fields */}
          <div className="w-[340px] shrink-0 space-y-3">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="font-mono text-sm bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">End Date <span className="text-muted-foreground/50">(optional)</span></Label>
                <div className="relative flex items-center gap-1">
                  <Input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value)} className="font-mono text-sm bg-secondary border-border flex-1" />
                  {form.endDate && (
                    <button type="button" onClick={() => set('endDate', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {!form.endDate && (
                  <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                    In Progress
                  </p>
                )}
              </div>
            </div>

            {/* Pair & Account */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Pair</Label>
                <PairCombobox value={form.pair} onChange={v => set('pair', v)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Account</Label>
                <Select value={form.accountId} onValueChange={v => set('accountId', v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Long / Short */}
            <div>
              <Label className="text-xs text-muted-foreground">Direction</Label>
              <div className="flex gap-2 mt-1.5">
                {(['Buy', 'Sell'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('type', v)}
                    className={`flex-1 px-4 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      form.type === v
                        ? v === 'Buy' ? 'bg-profit/15 border-profit/50 text-profit' : 'bg-loss/15 border-loss/50 text-loss'
                        : 'bg-secondary border-border text-muted-foreground'
                    }`}
                  >
                    {v === 'Buy' ? '↑ Long' : '↓ Short'}
                  </button>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Profit ($)</Label>
                <Input type="text" inputMode="decimal" value={resultText} onChange={decimalHandler('result', setResultText, true)} className="font-mono text-sm bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Comm.</Label>
                <Input type="text" inputMode="decimal" value={commissionText} onChange={decimalHandler('commission', setCommissionText, false)} className="font-mono text-sm bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Swap</Label>
                <Input type="text" inputMode="decimal" value={swapText} onChange={decimalHandler('swap', setSwapText, true)} className="font-mono text-sm bg-secondary border-border" />
              </div>
            </div>

            {/* Risk % & R */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Risque (%)</Label>
                <Input type="text" inputMode="decimal" value={riskText} onChange={decimalHandler('riskPercent', setRiskText, false)} placeholder="ex: 1" className="font-mono text-sm bg-secondary border-border" />
              </div>
              <div className="bg-card rounded-md border border-border p-3 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">R</span>
                <span className={`font-mono font-bold ${rValue === null ? 'text-muted-foreground' : rValue >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {rValue === null ? '—' : `${rValue >= 0 ? '+' : ''}${rValue.toFixed(2)}R`}
                </span>
              </div>
            </div>

            {/* Exit Type */}
            <div>
              <Label className="text-xs text-muted-foreground">Trade Exit</Label>
              <Select value={form.exitType} onValueChange={v => set('exitType', v as ExitType)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIT_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'Manual' ? 'Manual Close' : t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Setup Quality */}
            <div>
              <Label className="text-xs text-muted-foreground">Setup Quality</Label>
              <div className="flex gap-1 mt-1.5">
                {([1, 2, 3] as SetupQuality[]).map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => set('setupQuality', q)}
                    className={`flex items-center gap-0.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      form.setupQuality === q
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-secondary border-border text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    {Array.from({ length: q }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Respected */}
            <div>
              <Label className="text-xs text-muted-foreground">Strategy Respected</Label>
              <div className="flex gap-2 mt-1.5">
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => set('strategyRespected', v)}
                    className={`px-4 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      form.strategyRespected === v
                        ? v ? 'bg-profit/15 border-profit/50 text-profit' : 'bg-loss/15 border-loss/50 text-loss'
                        : 'bg-secondary border-border text-muted-foreground'
                    }`}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {/* Net result */}
            <div className="bg-card rounded-md border border-border p-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Net Result</span>
              <span className={`font-mono font-bold ${net >= 0 ? 'text-profit' : 'text-loss'}`}>
                {net >= 0 ? '+' : ''}${net.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Right side - Notes & Images */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex-1 flex flex-col">
              <Label className="text-xs text-muted-foreground mb-1">Notes & Description</Label>
              <Textarea
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Describe the trade: entry reason, market context, observations, lessons learned..."
                className="flex-1 bg-secondary border-border text-sm min-h-[200px] resize-none"
              />
            </div>

            {/* Images section */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" />
                Images ({screenshots.length})
              </Label>

              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {screenshots.map((img, i) => (
                    <div key={i} className="relative rounded-md overflow-hidden border border-border group">
                      <img src={img} alt={`Image ${i + 1}`} className="w-full h-24 object-cover" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="flex flex-col items-center justify-center gap-1.5 h-16 rounded-md border border-dashed border-border bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                onClick={handlePaste}
                tabIndex={0}
              >
                <div className="flex items-center gap-2">
                  <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Click to paste or Ctrl+V</span>
                </div>
                <span className="text-[9px] text-muted-foreground/60">Copy an image to clipboard</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{editTrade ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </form>
  );

  if (asPanel) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-card text-foreground">
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div>
            <h2 className="text-base font-semibold">{editTrade ? 'Edit Trade' : 'New Trade'}</h2>
            {editTrade && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {editTrade.pair} · #{String(editTrade.tradeNumber).padStart(4, '0')}
              </p>
            )}
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content — single column */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-card" onPaste={handlePasteEvent}>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="font-mono text-sm bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date <span className="opacity-50">(optional)</span></Label>
              <div className="relative mt-1">
                <Input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value)} className="font-mono text-sm bg-secondary border-border" />
                {form.endDate && (
                  <button type="button" onClick={() => set('endDate', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {!form.endDate && <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />In Progress</p>}
            </div>
          </div>

          {/* Pair + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Pair</Label>
              <PairCombobox value={form.pair} onChange={v => set('pair', v)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Account</Label>
              <Select value={form.accountId} onValueChange={v => set('accountId', v)}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Direction + Exit on same row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Direction</Label>
              <div className="flex gap-2 mt-1">
                {(['Buy', 'Sell'] as const).map(v => (
                  <button key={v} type="button" onClick={() => set('type', v)}
                    className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${form.type === v ? v === 'Buy' ? 'bg-profit/15 border-profit/50 text-profit' : 'bg-loss/15 border-loss/50 text-loss' : 'bg-secondary border-border text-muted-foreground'}`}>
                    {v === 'Buy' ? '↑ Long' : '↓ Short'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Exit Type</Label>
              <Select value={form.exitType} onValueChange={v => set('exitType', v as ExitType)}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{EXIT_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'Manual' ? 'Manual Close' : t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Profit ($)</Label>
              <Input type="text" inputMode="decimal" value={resultText} onChange={decimalHandler('result', setResultText, true)} className="font-mono text-sm bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Commission</Label>
              <Input type="text" inputMode="decimal" value={commissionText} onChange={decimalHandler('commission', setCommissionText, false)} className="font-mono text-sm bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Swap</Label>
              <Input type="text" inputMode="decimal" value={swapText} onChange={decimalHandler('swap', setSwapText, true)} className="font-mono text-sm bg-secondary border-border mt-1" />
            </div>
          </div>

          {/* Risk % & R */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Risque (%)</Label>
              <Input type="text" inputMode="decimal" value={riskText} onChange={decimalHandler('riskPercent', setRiskText, false)} placeholder="ex: 1" className="font-mono text-sm bg-secondary border-border mt-1" />
            </div>
            <div className="bg-secondary/50 rounded-lg border border-border px-4 py-2.5 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">R</span>
              <span className={`font-mono font-bold text-sm ${rValue === null ? 'text-muted-foreground' : rValue >= 0 ? 'text-profit' : 'text-loss'}`}>
                {rValue === null ? '—' : `${rValue >= 0 ? '+' : ''}${rValue.toFixed(2)}R`}
              </span>
            </div>
          </div>

          {/* Quality + Strategy */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Setup Quality</Label>
              <div className="flex gap-2 mt-1">
                {([1, 2, 3] as SetupQuality[]).map(q => (
                  <button key={q} type="button" onClick={() => set('setupQuality', q)}
                    className={`flex items-center gap-0.5 flex-1 justify-center py-1.5 rounded-md border text-xs font-medium transition-colors ${form.setupQuality === q ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
                    {Array.from({ length: q }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Strategy</Label>
              <div className="flex gap-2 mt-1">
                {[true, false].map(v => (
                  <button key={String(v)} type="button" onClick={() => set('strategyRespected', v)}
                    className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${form.strategyRespected === v ? v ? 'bg-profit/15 border-profit/50 text-profit' : 'bg-loss/15 border-loss/50 text-loss' : 'bg-secondary border-border text-muted-foreground'}`}>
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Net result */}
          <div className="bg-secondary/50 rounded-lg border border-border px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Net Result</span>
            <span className={`font-mono font-bold text-sm ${net >= 0 ? 'text-profit' : 'text-loss'}`}>
              {net >= 0 ? '+' : ''}${net.toFixed(2)}
            </span>
          </div>

          {/* Notes — large */}
          <div className="flex flex-col">
            <Label className="text-xs text-muted-foreground mb-1.5">Notes & Description</Label>
            <Textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Entry reason, market context, observations, lessons learned…"
              className="bg-secondary border-border text-sm resize-none"
              style={{ minHeight: '220px' }}
            />
          </div>

          {/* Images */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" />Images ({screenshots.length})
            </Label>
            {screenshots.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {screenshots.map((img, i) => (
                  <div key={i} className="relative rounded-md overflow-hidden border border-border group">
                    <img src={img} alt={`Image ${i + 1}`} className="w-full h-28 object-cover" />
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-5 w-5 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col items-center justify-center gap-1.5 h-16 rounded-md border border-dashed border-border bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors" onClick={handlePaste} tabIndex={0}>
              <div className="flex items-center gap-2">
                <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Click to paste or Ctrl+V</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit as any}>{editTrade ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTrade ? 'Edit Trade' : 'Add Trade'}</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
};

export default AddTradeDialog;
