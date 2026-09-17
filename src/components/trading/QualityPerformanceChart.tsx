import { useId, useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, barCursor, Glow } from './chartFx';

interface Props {
  data: { quality: string; profit: number; count: number }[];
  accentColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
  usePercent?: boolean;
}

const QualityPerformanceChart = ({ data, accentColor, medianLineColor, medianLineVisible, usePercent }: Props) => {
  const uid = useId();
  const profitColor = accentColor || 'hsl(142, 71%, 45%)';
  const lossColor = 'hsl(0, 84%, 60%)';
  const { domain, ticks } = useMemo(() => {
    const vals = data.map(d => d.profit);
    if (vals.length === 0) return { domain: [0, 1] as [number, number], ticks: [0, 1] };
    const lo = Math.min(...vals, 0);
    const hi = Math.max(...vals, 0);
    const spread = hi - lo || 1;
    const d = niceDomain(lo - spread * 0.12, hi + spread * 0.05);
    return { domain: d, ticks: niceTicks(d[0], d[1]) };
  }, [data]);

  const dataAvg = useMemo(() => { let s = 0; return data.map((d, i) => { s += d.profit; return { ...d, avgLine: s / (i + 1) }; }); }, [data]);

  if (data.every(d => d.count === 0)) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Ajoutez des trades pour voir la performance par qualité
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dataAvg} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <Glow id={`glow-${uid}`} strength={3} />
          <linearGradient id={`qualProfit-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={profitColor} stopOpacity={1} />
            <stop offset="100%" stopColor={profitColor} stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id={`qualLoss-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lossColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={lossColor} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsla(215,15%,55%,0.14)" strokeWidth={1} strokeDasharray="3 6" vertical={false} />
        <ReferenceLine y={0} stroke="hsla(215,15%,55%,0.45)" strokeWidth={1} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" stroke={medianLineColor || 'hsl(38,92%,50%)'} strokeWidth={1} strokeDasharray="5 5" strokeOpacity={0.8} dot={false} connectNulls />
        )}
        <XAxis dataKey="quality" tick={{ fontSize: 12, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} />
        <YAxis domain={domain} ticks={ticks} tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} tickFormatter={v => usePercent ? `${v.toFixed(v < 1 && v > -1 ? 1 : 0)}%` : `$${v}`} />
        <Tooltip cursor={barCursor} contentStyle={glassTooltip} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: number, _: string, entry: any) => [usePercent ? `${value.toFixed(2)}% (${entry.payload.count} trades)` : `$${value.toFixed(2)} (${entry.payload.count} trades)`, 'Profit']} />
        <Bar dataKey="profit" radius={[6, 6, 0, 0]} barSize={22}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.profit >= 0 ? `url(#qualProfit-${uid})` : `url(#qualLoss-${uid})`}
              stroke={entry.profit >= 0 ? profitColor : lossColor}
              strokeWidth={1}
              filter={`url(#glow-${uid})`}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default QualityPerformanceChart;
