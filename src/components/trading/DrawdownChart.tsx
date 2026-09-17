import { useId, useMemo } from 'react';
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, lineCursor, Glow, makePulseDot } from './chartFx';

interface DrawdownChartProps {
  data: { date: string; drawdown: number }[];
  accentColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
}

const DrawdownChart = ({ data, accentColor, medianLineColor, medianLineVisible }: DrawdownChartProps) => {
  const uid = useId();
  const color = accentColor || 'hsl(25, 95%, 53%)';
  const { domain, ticks } = useMemo(() => {
    if (data.length === 0) return { domain: [-1, 0] as [number, number], ticks: [-1, 0] };
    const min = Math.min(...data.map(d => d.drawdown), 0);
    const spread = Math.abs(min) || 1;
    const d = niceDomain(min - spread * 0.12, spread * 0.05);
    return { domain: d, ticks: niceTicks(d[0], d[1]) };
  }, [data]);

  const dataAvg = useMemo(() => { let s = 0; return data.map((d, i) => { s += d.drawdown; return { ...d, avgLine: s / (i + 1) }; }); }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Ajoutez des trades pour voir le drawdown
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dataAvg} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <Glow id={`glow-${uid}`} />
          <linearGradient id={`ddGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.02} />
            <stop offset="45%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsla(215,15%,55%,0.14)" strokeWidth={1} strokeDasharray="3 6" vertical={false} />
        <ReferenceLine y={0} stroke="hsla(215,15%,55%,0.45)" strokeWidth={1} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" stroke={medianLineColor || 'hsl(38,92%,50%)'} strokeWidth={1} strokeDasharray="5 5" strokeOpacity={0.8} dot={false} connectNulls />
        )}
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} />
        <YAxis domain={domain} ticks={ticks} tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(v < 1 ? 1 : 0)}%`} />
        <Tooltip cursor={lineCursor} contentStyle={glassTooltip} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']} />
        <Area type="linear" dataKey="drawdown" stroke={color} fill={`url(#ddGrad-${uid})`} strokeWidth={2.5} filter={`url(#glow-${uid})`}
          dot={makePulseDot(data.length - 1, color)}
          activeDot={{ r: 4, fill: color, stroke: color, strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default DrawdownChart;
