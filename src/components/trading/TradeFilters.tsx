import { useState } from 'react';
import { Trade, EXIT_TYPES, ExitType } from '@/types/trade';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TradeFiltersProps {
  trades: Trade[];
  onFiltered: (filtered: Trade[]) => void;
}

const TradeFilters = ({ trades, onFiltered }: TradeFiltersProps) => {
  const [pair, setPair] = useState('');
  const [type, setType] = useState<'' | 'Buy' | 'Sell'>('');
  const [exitType, setExitType] = useState<'' | ExitType>('');
  const [result, setResult] = useState<'' | 'win' | 'loss'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState(false);

  const pairs = [...new Set(trades.map(t => t.pair))].sort();

  const applyFilters = (p: string, ty: string, ex: string, res: string, df: string, dt: string) => {
    let filtered = [...trades];
    if (p) filtered = filtered.filter(t => t.pair === p);
    if (ty) filtered = filtered.filter(t => t.type === ty);
    if (ex) filtered = filtered.filter(t => t.exitType === ex);
    if (res === 'win') filtered = filtered.filter(t => (t.result - t.commission - t.swap) >= 0);
    if (res === 'loss') filtered = filtered.filter(t => (t.result - t.commission - t.swap) < 0);
    if (df) filtered = filtered.filter(t => t.date >= df);
    if (dt) filtered = filtered.filter(t => t.date <= dt);
    onFiltered(filtered);
  };

  const update = (setter: Function, key: string, value: string) => {
    setter(value);
    const vals = { pair, type, exitType, result, dateFrom, dateTo, [key]: value };
    applyFilters(vals.pair, vals.type, vals.exitType, vals.result, vals.dateFrom, vals.dateTo);
  };

  const clearAll = () => { setPair(''); setType(''); setExitType(''); setResult(''); setDateFrom(''); setDateTo(''); onFiltered(trades); };

  const hasFilters = pair || type || exitType || result || dateFrom || dateTo;

  const chipClass = (active: boolean) => `px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant={expanded ? 'default' : 'outline'} size="sm" onClick={() => setExpanded(!expanded)} className="gap-1.5 text-xs"><Filter className="h-3.5 w-3.5" />Filters</Button>
        {hasFilters && (<Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-xs text-muted-foreground"><X className="h-3 w-3" />Reset</Button>)}
      </div>

      {expanded && (
        <div className="bg-card border border-border rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Pair</label>
            <select value={pair} onChange={e => update(setPair, 'pair', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="">All</option>
              {pairs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</label>
            <div className="flex gap-1">
              {['', 'Buy', 'Sell'].map(v => (<span key={v} className={chipClass(type === v)} onClick={() => update(setType, 'type', v)}>{v || 'All'}</span>))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Exit</label>
            <select value={exitType} onChange={e => update(setExitType, 'exitType', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="">All</option>
              {EXIT_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Result</label>
            <div className="flex gap-1">
              {[{ v: '', l: 'All' }, { v: 'win', l: 'Win' }, { v: 'loss', l: 'Loss' }].map(({ v, l }) => (<span key={v} className={chipClass(result === v)} onClick={() => update(setResult, 'result', v)}>{l}</span>))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={e => update(setDateFrom, 'dateFrom', e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={e => update(setDateTo, 'dateTo', e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeFilters;
