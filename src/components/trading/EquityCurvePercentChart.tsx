import { useMemo, useId } from 'react';
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, lineCursor, Glow, makePulseDot } from './chartFx';

interface Props {
  data: { date: string; percent: number; isLive?: boolean }[];
  accentColor?: string;
  liveColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
}

const EquityCurvePercentChart = ({ data, accentColor, liveColor, medianLineColor, medianLineVisible }: Props) => {
  const uid = useId();
  const color = accentColor || 'hsl(142, 71%, 45%)';
  const live = liveColor || 'hsl(38, 92%, 50%)';

  const liveStartIndex = useMemo(() => {
    const idx = data.findIndex(d => d.isLive);
    return idx === -1 ? data.length : idx;
  }, [data]);

  const hasLive = liveStartIndex < data.length;

  const chartData = useMemo(() => {
    let s = 0;
    return data.map((d, i) => {
      s += d.percent;
      return { ...d, percentClosed: i <= liveStartIndex ? d.percent : null, percentLive: i >= liveStartIndex - 1 && hasLive ? d.percent : null, avgLine: s / (i + 1) };
    });
  }, [data, liveStartIndex, hasLive]);

  const { domain, ticks } = useMemo(() => {
    if (data.length === 0) return { domain: [0, 1] as [number, number], ticks: [0, 1] };
    const values = data.map(d => d.percent);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - Math.min(min, 0) || 1;
    const padding = Math.max(spread * 0.1, 0.5);
    const d = niceDomain(Math.min(0, min) - padding * 0.5, max + padding);
    return { domain: d, ticks: niceTicks(d[0], d[1]) };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <Glow id={`glow-${uid}`} />
          <linearGradient id={`pctGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="55%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`pctLiveGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={live} stopOpacity={0.55} />
            <stop offset="55%" stopColor={live} stopOpacity={0.16} />
            <stop offset="100%" stopColor={live} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsla(215,15%,55%,0.14)" strokeWidth={1} strokeDasharray="3 6" vertical={false} />
        <ReferenceLine y={0} stroke="hsla(215,15%,55%,0.45)" strokeWidth={1} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" stroke={medianLineColor || 'hsl(38,92%,50%)'} strokeWidth={1} strokeDasharray="5 5" strokeOpacity={0.8} dot={false} connectNulls />
        )}
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} />
        <YAxis domain={domain} ticks={ticks} tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(v < 1 ? 1 : 0)}%`} />
        <Tooltip cursor={lineCursor} contentStyle={glassTooltip} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
          formatter={(value: number, name: string) => [
            `${value.toFixed(2)}%`,
            name === 'percentLive' ? 'Performance (Live 🔴)' : 'Performance',
          ]}
        />
        <Area type="linear" dataKey="percentClosed" stroke={color} strokeWidth={2} fill={`url(#pctGrad-${uid})`} filter={`url(#glow-${uid})`}
          dot={hasLive ? false : makePulseDot(data.length - 1, color)}
          activeDot={{ r: 4, stroke: color, fill: 'hsl(220, 18%, 10%)' }} connectNulls={false} />
        {hasLive && (
          <Area type="linear" dataKey="percentLive" stroke={live} strokeWidth={2} strokeDasharray="6 3" fill={`url(#pctLiveGrad-${uid})`} filter={`url(#glow-${uid})`}
            dot={makePulseDot(data.length - 1, live)}
            activeDot={{ r: 4, stroke: live, fill: 'hsl(220, 18%, 10%)' }} connectNulls={false} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default EquityCurvePercentChart;
