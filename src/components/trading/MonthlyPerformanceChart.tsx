import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartSeriesMotion, chartTooltipMotion } from '@/lib/chartMotion';

interface Month { date: string; performance: number | null; trades: number; rr?: number | null; }
const monthLabel = (date: string, full = false) => new Date(`${date}-01T12:00:00`).toLocaleDateString('fr-FR', { month: full ? 'long' : 'short', year: '2-digit' });
const percent = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;

export default function MonthlyPerformanceChart({ data, validCapital, metric = 'performance' }: { data: Month[]; validCapital: boolean; metric?: 'performance' | 'rr' }) {
  const isRR = metric === 'rr';
  const label = isRR ? 'RR réalisé' : 'Rendement réalisé';
  const format = (value: number) => isRR ? `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} R` : percent(value);
  const missing = data.filter(month => month[metric] == null).length;
  if ((!isRR && !validCapital) || !data.length) return <div className="flex h-72 items-center justify-center text-center text-sm text-muted-foreground">{!isRR && !validCapital ? 'Renseigne un capital initial positif pour calculer les performances.' : 'Tes performances mensuelles apparaîtront après une première clôture.'}</div>;
  return <div><div className="h-80 min-w-0" role="img" aria-label={`${label} par mois${isRR ? ' en R' : ' en pourcentage du capital initial'}, avec nombre de trades`}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{top: 20, right: 16, left: 0, bottom: 16}} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} height={54} minTickGap={28} tick={({x, y, payload}) => {
          const item = data.find(month => month.date === payload.value);
          return <g transform={`translate(${x},${y})`}><text y={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>{monthLabel(String(payload.value))}</text><text y={34} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={10}>{item?.[metric] == null ? 'Indisponible' : `${item.trades} trades`}</text></g>;
        }} />
        <YAxis tickFormatter={value => format(Number(value))} tick={{fontSize:11, fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} width={58} />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.45)" />
        <Tooltip {...chartTooltipMotion} cursor={{fill:'hsl(var(--muted-foreground) / 0.06)'}} content={({active, payload}) => {
          if (!active || !payload?.length) return null;
          const month = payload[0].payload as Month;
          return <div className="rounded-xl border border-border bg-popover px-4 py-3 text-xs text-popover-foreground shadow-sm"><p className="mb-3 font-medium capitalize">{monthLabel(month.date, true)}</p><div className="flex items-center justify-between gap-8"><span className="text-muted-foreground">{label}</span><strong className={Number(month[metric]) < 0 ? 'text-loss' : 'text-profit'}>{month[metric] == null ? 'Indisponible' : format(month[metric]!)}</strong></div><div className="mt-2 flex items-center justify-between gap-8"><span className="text-muted-foreground">Trades clôturés</span><span className="font-medium tabular-nums">{month.trades}</span></div></div>;
        }} />
        <Bar {...chartSeriesMotion} dataKey={metric} name={label} maxBarSize={64} radius={4}>
          {data.map(month => <Cell key={month.date} fill={Number(month[metric]) < 0 ? 'hsl(var(--loss))' : 'hsl(var(--profit))'} fillOpacity={0.8} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>{isRR && missing > 0 && <p className="mt-2 text-xs text-muted-foreground">RR indisponible pour {missing} mois : risque ou capital initial manquant pour au moins un trade.</p>}</div>;
}
