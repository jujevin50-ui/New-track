import { useId, useMemo } from 'react';
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ReferenceLine, ReferenceDot } from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, lineCursor, Glow, makePulseDot, gridProps, axisTick, chartMargin, zeroLine, medianLineStyle } from './chartFx';

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

  const ddValues = data.map(d => d.drawdown);
  const worstDd = Math.min(...ddValues);
  const worstDdIdx = ddValues.indexOf(worstDd);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dataAvg} margin={chartMargin}>
        <defs>
          <Glow id={`glow-${uid}`} />
          <linearGradient id={`ddGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.02} />
            <stop offset="45%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <ReferenceLine y={0} {...zeroLine} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" {...medianLineStyle(medianLineColor)} dot={false} connectNulls />
        )}
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis domain={domain} ticks={ticks} tick={axisTick} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(v < 1 ? 1 : 0)}%`} />
        <Tooltip cursor={lineCursor} contentStyle={glassTooltip} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']} />
        <Area type="monotone" dataKey="drawdown" stroke={color} fill={`url(#ddGrad-${uid})`} strokeWidth={2} filter={`url(#glow-${uid})`}
          dot={makePulseDot(data.length - 1, color)}
          activeDot={{ r: 4, fill: color, stroke: color, strokeWidth: 2 }} />
        {worstDd < 0 && (
          <ReferenceDot x={data[worstDdIdx].date} y={worstDd} r={2.5} fill={color} stroke="none"
            label={{ value: `${worstDd.toFixed(1)}%`, position: 'bottom', fill: color, fontSize: 10, fontWeight: 700 }} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default DrawdownChart;
