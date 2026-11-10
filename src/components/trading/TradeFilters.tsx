import { initialTradeFilters, type TradeFilterState } from '@/lib/tradeFilters';
import type { ReactNode } from 'react';
import { EXIT_TYPES, type Trade } from '@/types/trade';
import DashboardFilter from './DashboardFilter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface Props { trades: Trade[]; filters: TradeFilterState; onChange: (filters: TradeFilterState) => void; children?: ReactNode; actions?: ReactNode; }
export default function TradeFilters({ trades, filters, onChange, children, actions }: Props) {
  const pairs = [...new Set([...trades.map(trade => trade.pair), ...(filters.pair !== 'all' ? [filters.pair] : [])])].sort();
  const set = (key: keyof TradeFilterState, value: string) => onChange({...filters,[key]:value});
  const active = Object.keys(filters).some(key => filters[key as keyof TradeFilterState] !== initialTradeFilters[key as keyof TradeFilterState]);
  const field = (key: keyof TradeFilterState, label: string, options: {value:string;label:string}[]) => <DashboardFilter label={label} ariaLabel={`Filtre ${label.toLowerCase()}`} value={filters[key]} onChange={value => set(key,value)} options={options}/>;
  return <div className="space-y-5">
    <div className="trades-toolbar"><div className="dashboard-filter-controls trades-filter-controls">
      {children}
      {field('pair','Paire',[{value:'all',label:'Toutes'},...pairs.map(pair => ({value:pair,label:pair}))])}
      {field('position','Position',[{value:'all',label:'Toutes'},{value:'open',label:'Ouvertes'},{value:'closed',label:'Clôturées'}])}
      {field('result','Résultat',[{value:'all',label:'Tous'},{value:'win',label:'Gagnants'},{value:'loss',label:'Perdants'},{value:'neutral',label:'Neutres'}])}
    </div>{actions}</div>
    <details className="trades-advanced"><summary className="cursor-pointer text-xs text-muted-foreground">Plus de filtres</summary><div className="dashboard-filter-controls mt-4">
      {field('direction','Direction',[{value:'all',label:'Toutes'},{value:'Buy',label:'Long'},{value:'Sell',label:'Short'}])}
      {field('exit','Sortie',[{value:'all',label:'Toutes'},...EXIT_TYPES.map(exit => ({value:exit,label:exit}))])}
      {field('strategy','Stratégie',[{value:'all',label:'Toutes'},{value:'yes',label:'Respectée'},{value:'no',label:'Non respectée'}])}
      <div className="dashboard-filter-field"><label htmlFor="trades-from" className="dashboard-filter-caption">Entrée à partir du</label><Input id="trades-from" type="date" value={filters.from} onChange={event=>set('from',event.target.value)} className="h-[42px] rounded-[10px] bg-transparent text-xs"/></div>
      <div className="dashboard-filter-field"><label htmlFor="trades-to" className="dashboard-filter-caption">Entrée jusqu’au</label><Input id="trades-to" type="date" min={filters.from || undefined} value={filters.to} onChange={event=>set('to',event.target.value)} className="h-[42px] rounded-[10px] bg-transparent text-xs"/></div>
    </div></details>
    {filters.from && filters.to && filters.from > filters.to && <p role="alert" className="text-xs text-loss">La fin doit être postérieure au début.</p>}
    {active && <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground" onClick={()=>onChange({...initialTradeFilters})}><RotateCcw className="h-3 w-3"/>Réinitialiser les filtres</Button>}
  </div>;
}
