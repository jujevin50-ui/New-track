import { useId, useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { Trade, getNetResult } from '@/types/trade';
import { Account } from '@/types/account';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, barCursor } from './chartFx';

interface ProfitPerTradeChartProps {
  trades: Trade[];
  accounts: Account[];
  accentColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
}

const ProfitPerTradeChart = ({ trades, accounts, accentColor, medianLineColor, medianLineVisible }: ProfitPerTradeChartProps) => {
  const uid = useId();
  const profitColor = accentColor || 'hsl(142, 71%, 45%)';
  const lossColor = 'hsl(0, 84%, 60%)';

  const data = useMemo(() => {
    let s = 0;
    return trades.map((t, i) => {
      const bal = accounts.find(a => a.id === t.accountId)?.initialBalance || 1;
      const profit = (getNetResult(t) / bal) * 100;
      s += profit;
      return { name: `#${i + 1}`, profit, pair: t.pair, avgLine: s / (i + 1) };
    });
  }, [trades, accounts]);

  const { domain, ticks } = useMemo(() => {
    const vals = data.map(d => d.profit);
    if (vals.length === 0) return { domain: [0, 1] as [number, number], ticks: [0, 1] };
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 0);
    const d = niceDomain(min, max);
    return { domain: d, ticks: niceTicks(d[0], d[1]) };
  }, [data]);

  if (trades.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Ajoutez des trades pour voir le profit par trade
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <defs>
          {/* glow vertical gradients — bright at the tip, fading toward zero */}
          <linearGradient id={`barProfit-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={profitColor} stopOpacity={1} />
            <stop offset="100%" stopColor={profitColor} stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id={`barLoss-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lossColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={lossColor} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsla(215,15%,55%,0.14)" strokeWidth={1} strokeDasharray="3 6" vertical={false} />
        <ReferenceLine y={0} stroke="hsla(215,15%,55%,0.45)" strokeWidth={1} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" stroke={medianLineColor || 'hsl(38,92%,50%)'} strokeWidth={1} strokeDasharray="5 5" strokeOpacity={0.8} dot={false} connectNulls />
        )}
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} />
        <YAxis domain={domain} ticks={ticks} tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip cursor={barCursor} contentStyle={glassTooltip} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: number, _name: string, entry: any) => [`${value.toFixed(2)}%`, entry.payload.pair]} />
        <Bar dataKey="profit" radius={[5, 5, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.profit >= 0 ? `url(#barProfit-${uid})` : `url(#barLoss-${uid})`}
              stroke={entry.profit >= 0 ? profitColor : lossColor}
              strokeWidth={1}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default ProfitPerTradeChart;
