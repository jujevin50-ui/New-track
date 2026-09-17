import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays } from 'lucide-react';

export interface DateRange {
  from: string;
  to: string;
}

const PRESETS = [
  { label: 'All', days: 0 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
] as const;

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const DashboardDateFilter = ({ value, onChange }: Props) => {
  const [activePreset, setActivePreset] = useState<number>(0);

  const handlePreset = (days: number) => {
    setActivePreset(days);
    if (days === 0) {
      onChange({ from: '', to: '' });
    } else {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);
      onChange({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
    }
  };

  const handleCustom = (key: 'from' | 'to', val: string) => {
    setActivePreset(-1);
    onChange({ ...value, [key]: val });
  };

  const activeLabel = activePreset === -1 ? 'Custom' : PRESETS.find(p => p.days === activePreset)?.label || 'All';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal no-drag">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{activeLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-3" align="start">
        <div className="flex gap-1">
          {PRESETS.map(p => (<Button key={p.days} variant={activePreset === p.days ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5 text-[11px]" onClick={() => handlePreset(p.days)}>{p.label}</Button>))}
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</label>
            <Input type="date" value={value.from} onChange={e => handleCustom('from', e.target.value)} className="h-7 text-[11px] w-[130px]" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</label>
            <Input type="date" value={value.to} onChange={e => handleCustom('to', e.target.value)} className="h-7 text-[11px] w-[130px]" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DashboardDateFilter;
