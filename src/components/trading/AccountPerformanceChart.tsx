import { useId, useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, barCursor, Glow } from './chartFx';

interface Props {
  data: { name: string; profit: number; profitPercent: number; trades: number }[];
  accentColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
}

const ACCOUNT_COLORS = [
  'hsl(270, 70%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(25, 95%, 53%)',
  'hsl(270, 70%, 55%)',
  'hsl(340, 75%, 55%)',
  'hsl(180, 65%, 45%)',
  'hsl(50, 90%, 50%)',
  'hsl(300, 60%, 50%)',
];

const AccountPerformanceChart = ({ data, accentColor, medianLineColor, medianLineVisible }: Props) => {
  const uid = useId();
  const { domain, ticks } = useMemo(() => {
    const vals = data.map(d => d.profitPercent);
    if (vals.length === 0) return { domain: [0, 1] as [number, number], ticks: [0, 1] };
    const d = niceDomain(Math.min(...vals, 0), Math.max(...vals, 0));
    return { domain: d, ticks: niceTicks(d[0], d[1]) };
  }, [data]);

  const dataAvg = useMemo(() => { let s = 0; return data.map((d, i) => { s += d.profitPercent; return { ...d, avgLine: s / (i + 1) }; }); }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Ajoutez des comptes pour comparer
      </div>
    );
  }

  const getColor = (index: number) => accentColor || ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dataAvg} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <Glow id={`glow-${uid}`} strength={3} />
          {data.map((_, i) => {
            const color = getColor(i);
            return (
              <linearGradient key={i} id={`accColor-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.4} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid stroke="hsla(215,15%,55%,0.14)" strokeWidth={1} strokeDasharray="3 6" vertical={false} />
        <ReferenceLine y={0} stroke="hsla(215,15%,55%,0.45)" strokeWidth={1} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" stroke={medianLineColor || 'hsl(38,92%,50%)'} strokeWidth={1} strokeDasharray="5 5" strokeOpacity={0.8} dot={false} connectNulls />
        )}
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} />
        <YAxis domain={domain} ticks={ticks} tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(v < 1 ? 1 : 0)}%`} />
        <Tooltip
          cursor={barCursor}
          contentStyle={glassTooltip}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(_: any, __: string, entry: any) => [
            `${entry.payload.profitPercent.toFixed(2)}% ($${entry.payload.profit.toFixed(2)}) · ${entry.payload.trades} trades`,
            'Performance'
          ]}
        />
        <Bar dataKey="profitPercent" radius={[8, 8, 0, 0]} barSize={40}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={`url(#accColor-${uid}-${index})`}
              stroke={getColor(index)}
              strokeWidth={1}
              filter={`url(#glow-${uid})`}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default AccountPerformanceChart;
