import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartCurveMotion, chartLineCursor, chartTooltipMotion } from '@/lib/chartMotion';
import { niceDomain, niceTicks } from '@/lib/chartTicks';

interface Props {
  data: { date: string; cumulative: number }[];
  currency: string;
  startingCapital: number;
  unit: 'amount' | 'percent';
}

function money(value: number, currency: string, compact = false) {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency, currencyDisplay: 'narrowSymbol',
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 1 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString('fr-FR', { notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : 2 })}${currency && currency !== 'UNKNOWN' ? ` ${currency}` : ''}`;
  }
}
function dateLabel(value: string, full = false) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: full ? 'long' : 'short', ...(full ? { year: 'numeric' } : {}) }) : value;
}

export default function DashboardPerformanceChart({ data, currency, startingCapital, unit }: Props) {
  const id = useId();
  const validCapital = Number.isFinite(startingCapital) && startingCapital > 0;
  const points = useMemo(() => data.filter(point => Number.isFinite(point.cumulative)).map(point => ({ ...point, value: unit === 'percent' && validCapital ? point.cumulative / startingCapital * 100 : point.cumulative })), [data, unit, validCapital, startingCapital]);
  const format = (value: number, compact = false) => unit === 'percent' ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %` : money(value, currency, compact);

  if (!points.length || (unit === 'percent' && !validCapital)) return <div className="flex h-full min-h-48 items-center justify-center px-6 text-center text-sm text-muted-foreground">{unit === 'percent' && !validCapital ? 'Un capital initial positif est nécessaire pour afficher les pourcentages.' : 'Tes premiers trades clôturés feront apparaître ta progression.'}</div>;

  const values = points.map(point => point.value);
  const low = Math.min(0, ...values), high = Math.max(0, ...values);
  const padding = (high - low || 1) * 0.08;
  const domain = niceDomain(low - padding, high + padding);
  const ticks = niceTicks(...domain);
  const color = points[points.length - 1].value < 0 ? 'hsl(var(--loss))' : 'hsl(var(--primary))';

  return <div className="h-full min-h-48 w-full min-w-0" role="img" aria-label={`Progression du résultat net cumulé${unit === 'percent' ? ' en pourcentage du capital initial' : ` en ${currency === 'UNKNOWN' ? 'devise non renseignée' : currency}`} : ${format(points[points.length - 1].value)}`}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 16, right: 14, bottom: 8, left: 0 }}>
        <defs><linearGradient id={`dashboard-net-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.18} /><stop offset="100%" stopColor={color} stopOpacity={0.015} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.7)" strokeDasharray="3 5" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={35} tickMargin={12} tickFormatter={value => dateLabel(String(value))} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis domain={domain} ticks={ticks} axisLine={false} tickLine={false} width={66} tickFormatter={value => format(Number(value), true)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.4)" strokeDasharray="4 4" />
        <Tooltip {...chartTooltipMotion} cursor={chartLineCursor} content={({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          const value = Number(payload[0].value);
          return <div className="rounded-xl border border-border bg-popover px-4 py-3 text-xs text-popover-foreground shadow-sm"><p className="mb-2 font-medium">{dateLabel(String(label), true)}</p><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full" style={{ background: color }} /><span className="text-muted-foreground">Résultat net cumulé</span><span className="font-semibold tabular-nums">{format(value)}</span></div></div>;
        }} />
        <Area {...chartCurveMotion} type="monotone" dataKey="value" name="Résultat net cumulé" stroke={color} strokeWidth={2.25} fill={`url(#dashboard-net-${id})`} dot={points.length < 3 ? { r: 3, fill: color, strokeWidth: 0 } : false} connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
