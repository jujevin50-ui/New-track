import { useId, useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Line } from 'recharts';

interface Props {
  data: { range: string; count: number; isProfit: boolean }[];
  accentColor?: string;
  medianLineColor?: string;
  medianLineVisible?: boolean;
}

const tooltipStyle = {
  backgroundColor: 'hsla(0, 0%, 8%, 0.9)',
  border: '1px solid hsla(0, 0%, 20%, 0.5)',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 8px 32px hsla(0, 0%, 0%, 0.4)',
};

const ProfitDistributionChart = ({ data, accentColor, medianLineColor, medianLineVisible }: Props) => {
  const uid = useId();
  const profitColor = accentColor || 'hsl(142, 71%, 45%)';
  const lossColor = 'hsl(0, 84%, 60%)';

  const dataAvg = useMemo(() => { let s = 0; return data.map((d, i) => { s += d.count; return { ...d, avgLine: s / (i + 1) }; }); }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Ajoutez des trades pour voir la distribution
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dataAvg} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={`distProfit-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={profitColor} stopOpacity={0.95} />
            <stop offset="100%" stopColor={profitColor} stopOpacity={0.65} />
          </linearGradient>
          <linearGradient id={`distLoss-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lossColor} stopOpacity={0.65} />
            <stop offset="100%" stopColor={lossColor} stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsla(215,15%,55%,0.18)" strokeWidth={1} vertical={false} />
        {medianLineVisible !== false && (
          <Line type="monotone" dataKey="avgLine" stroke={medianLineColor || 'hsl(38,92%,50%)'} strokeWidth={1} dot={false} connectNulls />
        )}
        <XAxis dataKey="range" tick={{ fontSize: 9, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
        <YAxis tick={{ fontSize: 10, fill: 'hsla(215, 15%, 55%, 0.7)' }} tickLine={false} axisLine={false} />
        <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(value: number) => [value, 'Trades']} labelFormatter={l => `$${l} à $${Number(l) + 50}`} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.isProfit ? `url(#distProfit-${uid})` : `url(#distLoss-${uid})`} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default ProfitDistributionChart;
