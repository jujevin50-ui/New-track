import { useId, useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine } from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, barCursor, Glow } from './chartFx';

interface PairPerformanceChartProps {
  data: { pair: string; percent: number }[];
  accentColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
}

const PairPerformanceChart = ({ data, accentColor, medianLineColor, medianLineVisible }: PairPerformanceChartProps) => {
  const uid = useId();
  const profitColor = accentColor || 'hsl(270, 70%, 60%)';
  const lossColor = accentColor ? 'hsl(0, 84%, 60%)' : 'hsl(var(--foreground))';
  const { domain, ticks } = useMemo(() => {
    const vals = data.map(d => d.percent);
    if (vals.length === 0) return { domain: [0, 1] as [number, number], ticks: [0, 1] };
    const d = niceDomain(Math.min(...vals, 0), Math.max(...vals, 0));
    return { domain: d, ticks: niceTicks(d[0], d[1]) };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Ajoutez des trades pour voir la performance par paire
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.percent - a.percent);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={sorted} layout="vertical" margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
        <defs>
          <Glow id={`glow-${uid}`} strength={2.5} />
          <linearGradient id={`pairProfit-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={profitColor} stopOpacity={0.45} />
            <stop offset="100%" stopColor={profitColor} stopOpacity={1} />
          </linearGradient>
          <linearGradient id={`pairLoss-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lossColor} stopOpacity={1} />
            <stop offset="100%" stopColor={lossColor} stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsla(215,15%,55%,0.14)" strokeWidth={1} strokeDasharray="3 6" vertical={false} />
        <ReferenceLine x={0} stroke="hsla(215,15%,55%,0.45)" strokeWidth={1} />
        {medianLineVisible !== false && <ReferenceLine x={data.length > 0 ? data.reduce((s, d) => s + d.percent, 0) / data.length : 0} stroke={medianLineColor || 'hsl(38,92%,50%)'} strokeWidth={1} strokeDasharray="5 5" strokeOpacity={0.8} />}
        <XAxis type="number" domain={domain} ticks={ticks} tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(v < 1 && v > -1 ? 1 : 0)}%`} />
        <YAxis dataKey="pair" type="category" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 75%)', fontWeight: 500 }} tickLine={false} axisLine={false} width={65} />
        <Tooltip cursor={barCursor} contentStyle={glassTooltip} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'Performance']} />
        <Bar dataKey="percent" radius={[0, 8, 8, 0]} barSize={18}>
          {sorted.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.percent >= 0 ? `url(#pairProfit-${uid})` : `url(#pairLoss-${uid})`}
              stroke={entry.percent >= 0 ? profitColor : lossColor}
              strokeWidth={1}
              filter={`url(#glow-${uid})`}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PairPerformanceChart;
