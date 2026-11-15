import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartSeriesMotion, chartTooltipMotion } from '@/lib/chartMotion';

import type { TradePerformancePoint } from '@/lib/tradePerformance';
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const percent = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;

export default function TradePerformanceChart({ data, metric = 'performance' }: { data: TradePerformancePoint[]; metric?: 'performance' | 'rr' }) {
  const isRR = metric === 'rr';
  const label = isRR ? 'RR réalisé' : 'Rendement réalisé';
  const format = (value: number) => isRR ? `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} R` : percent(value);
  const missing = data.filter(trade => trade[metric] == null).length;
  if (!data.length) return <div className="flex h-72 items-center justify-center text-center text-sm text-muted-foreground">Tes premiers trades clôturés apparaîtront ici.</div>;
  return <div><div className="max-w-full overflow-x-auto"><div className="h-80 min-w-0" style={{ minWidth: Math.max(300, data.length * 44 + 80) }} role="img" aria-label={`${label} de chaque trade clôturé${isRR ? ' en R' : ' en pourcentage du capital initial de son compte'}`}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{top: 20, right: 16, left: 0, bottom: 16}} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
        <XAxis dataKey="id" axisLine={false} tickLine={false} height={54} interval={0} tick={({x, y, payload}) => {
          const item = data.find(trade => trade.id === payload.value);
          return <g transform={`translate(${x},${y})`}><text y={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>#{item?.tradeNumber}</text><text y={34} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={9}>{item?.[metric] == null ? 'Indisponible' : item.pair}</text></g>;
        }} />
        <YAxis tickFormatter={value => format(Number(value))} tick={{fontSize:11, fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} width={58} />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.45)" />
        <Tooltip {...chartTooltipMotion} cursor={{fill:'hsl(var(--muted-foreground) / 0.06)'}} content={({active, payload}) => {
          if (!active || !payload?.length) return null;
          const trade = payload[0].payload as TradePerformancePoint;
          return <div className="rounded-xl border border-border bg-popover px-4 py-3 text-xs text-popover-foreground shadow-sm"><p className="mb-3 font-medium capitalize">Trade #{trade.tradeNumber} · {trade.pair}</p><div className="flex items-center justify-between gap-8"><span className="text-muted-foreground">{label}</span><strong className={Number(trade[metric]) < 0 ? 'text-loss' : 'text-profit'}>{trade[metric] == null ? 'Indisponible' : format(trade[metric]!)}</strong></div><div className="mt-2 flex items-center justify-between gap-8"><span className="text-muted-foreground">Clôture</span><span className="font-medium tabular-nums">{dateLabel(trade.date)}</span></div></div>;
        }} />
        <Bar {...chartSeriesMotion} dataKey={metric} name={label} maxBarSize={64} radius={4}>
          {data.map(trade => <Cell key={trade.id} fill={Number(trade[metric]) < 0 ? 'hsl(var(--loss))' : 'hsl(var(--profit))'} fillOpacity={0.8} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div></div>{missing > 0 && <p className="mt-2 text-xs text-muted-foreground">{label} indisponible pour {missing} trade(s) : {isRR ? 'risque ou capital initial manquant ou invalide.' : 'capital initial manquant ou invalide.'}</p>}</div>;
}
