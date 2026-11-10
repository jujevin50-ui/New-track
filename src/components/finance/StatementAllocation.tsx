import { chartSeriesMotion, chartTooltipMotion } from '@/lib/chartMotion';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PALETTE } from './financeCharts';
import { eur } from './ui';

export default function StatementAllocation({ holdings }: { holdings: { id: string; name: string; value: number }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const data = holdings.map((holding, index) => ({ ...holding, value: Number(holding.value), color: PALETTE[index % PALETTE.length] })).filter(holding => holding.value > 0);
  const total = data.reduce((sum, holding) => sum + holding.value, 0);
  const selected = data.find(holding => holding.id === active);

  return <div className="space-y-4">
    <div className="relative h-[220px]" role="img" aria-label={`Répartition de ${data.length} actifs, total ${eur(total)}`}>
      <ResponsiveContainer width="100%" height="100%"><PieChart>
        <Pie {...chartSeriesMotion} data={data} dataKey="value" nameKey="name" innerRadius={78} outerRadius={100} paddingAngle={data.length > 1 ? 3 : 0} cornerRadius={5} startAngle={90} endAngle={-270} strokeWidth={0}>
          {data.map(holding => <Cell key={holding.id} fill={holding.color} fillOpacity={!selected || active === holding.id ? 1 : 0.25} className="transition-opacity duration-200 motion-reduce:transition-none" />)}
        </Pie>
        <Tooltip {...chartTooltipMotion} content={({ active: visible, payload }) => {
          if (!visible || !payload?.length) return null;
          const point = payload[0].payload;
          return <div className="max-w-64 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm"><p className="font-medium">{point.name}</p><p className="mt-1">{eur(point.value)} · {(point.value / total * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</p></div>;
        }} />
      </PieChart></ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{selected ? 'Actif sélectionné' : 'Total du relevé'}</span><span className="mt-1 text-xl font-semibold tracking-tight">{(selected?.value ?? total).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span><span className="mt-1 text-[11px] text-muted-foreground">{selected ? `${(selected.value / total * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % du total` : `${data.length} actif${data.length > 1 ? 's' : ''}`}</span></div>
    </div>
    <div className="space-y-1 border-t border-border/60 pt-3" aria-label="Détail de la répartition">{data.map(holding => {
      const share = holding.value / total * 100;
      return <button key={holding.id} type="button" aria-pressed={active === holding.id} onClick={() => setActive(previous => previous === holding.id ? null : holding.id)} className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active === holding.id ? 'bg-secondary/80' : 'hover:bg-secondary/40'}`}><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: holding.color }} /><span className="min-w-0 flex-1 truncate text-xs font-medium" title={holding.name}>{holding.name}</span><span className="shrink-0 text-right"><span className="block text-xs font-semibold tabular-nums">{eur(holding.value)}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{share.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</span></span></button>;
    })}</div>
    {!data.length && <p className="text-center text-xs text-muted-foreground">Aucun actif avec une valeur positive sur ce relevé.</p>}
  </div>;
}
