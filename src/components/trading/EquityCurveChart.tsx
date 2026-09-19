import { useId, useMemo } from 'react';
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line } from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, lineCursor, Glow, makePulseDot, gridProps, axisTick, chartMargin, medianLineStyle } from './chartFx';

interface EquityCurveChartProps {
  data: { date: string; balance: number; isLive?: boolean }[];
  accentColor?: string;
  liveColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
}

const EquityCurveChart = ({ data, accentColor, liveColor, medianLineColor, medianLineVisible }: EquityCurveChartProps) => {
  const uid = useId();
  const color = accentColor || 'hsl(var(--foreground))';
  const live = liveColor || 'hsl(38, 92%, 50%)';

  const liveStartIndex = useMemo(() => {
    const idx = data.findIndex(d => d.isLive);
    return idx === -1 ? data.length : idx;
  }, [data]);

  const hasLive = liveStartIndex < data.length;

  const chartData = useMemo(() => {
    let s = 0;
    return data.map((d, i) => {
      s += d.balance;
      return { ...d, balanceClosed: i <= liveStartIndex ? d.balance : null, balanceLive: i >= liveStartIndex - 1 && hasLive ? d.balance : null, avgLine: s / (i + 1) };
    });
  }, [data, liveStartIndex, hasLive]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Add trades to see the equity curve
      </div>
    );
  }

  const values = data.map(d => d.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || min * 0.02;
  const padding = spread * 0.15;
  const domain = niceDomain(min - padding, max + padding);
  const ticks = niceTicks(domain[0], domain[1]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={chartMargin}>
        <defs>
          <Glow id={`glow-${uid}`} />
          <linearGradient id={`balGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="55%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`liveGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={live} stopOpacity={0.4} />
            <stop offset="55%" stopColor={live} stopOpacity={0.16} />
            <stop offset="100%" stopColor={live} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" {...medianLineStyle(medianLineColor)} dot={false} connectNulls />
        )}
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis domain={domain} ticks={ticks} tick={axisTick} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
        <Tooltip
          cursor={lineCursor}
          contentStyle={glassTooltip}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value: number, name: string) => [
            `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            name === 'balanceLive' ? 'Balance (Live 🔴)' : 'Balance',
          ]}
        />
        <Area type="monotone" dataKey="balanceClosed" stroke={color} fill={`url(#balGrad-${uid})`} strokeWidth={2} filter={`url(#glow-${uid})`}
          dot={hasLive ? false : makePulseDot(data.length - 1, color)}
          activeDot={{ r: 4, fill: color, stroke: color, strokeWidth: 2 }} connectNulls={false} />
        {hasLive && (
          <Area type="monotone" dataKey="balanceLive" stroke={live} fill={`url(#liveGrad-${uid})`} strokeWidth={2} strokeDasharray="6 3" filter={`url(#glow-${uid})`}
            dot={makePulseDot(data.length - 1, live)}
            activeDot={{ r: 4, fill: live, stroke: live, strokeWidth: 2 }} connectNulls={false} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default EquityCurveChart;
