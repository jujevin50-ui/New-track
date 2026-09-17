import { useId } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { glassTooltip, tooltipItemStyle, Glow } from './chartFx';

interface Props {
  data: { type: string; count: number }[];
  accentColor?: string;
}

const COLORS = [
  'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)',
  'hsl(270, 70%, 55%)',
  'hsl(25, 95%, 53%)',
  'hsl(200, 85%, 55%)',
];

const ExitDistributionChart = ({ data, accentColor }: Props) => {
  const uid = useId();
  const filtered = data.filter(d => d.count > 0);
  const colors = accentColor ? [accentColor, ...COLORS.slice(1)] : COLORS;
  const total = filtered.reduce((s, d) => s + d.count, 0);

  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Add trades to see exit distribution
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <defs>
          <Glow id={`glow-${uid}`} strength={4} />
        </defs>
        <Pie data={filtered} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={62} outerRadius={95} strokeWidth={0} paddingAngle={4} cornerRadius={8}>
          {filtered.map((entry, index) => {
            const originalIndex = data.findIndex(d => d.type === entry.type);
            return <Cell key={index} fill={colors[originalIndex % colors.length]} filter={`url(#glow-${uid})`} />;
          })}
        </Pie>
        {/* Center label: total trades */}
        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 26, fontWeight: 800, fill: 'hsl(0,0%,96%)', fontFamily: 'inherit' }}>
          {total}
        </text>
        <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 9, fontWeight: 600, fill: 'hsla(215,15%,55%,0.8)', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
          TRADES
        </text>
        <Tooltip cursor={false} contentStyle={glassTooltip} itemStyle={tooltipItemStyle}
          formatter={(value: number, name: string) => [`${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, name]} />
        <Legend wrapperStyle={{ fontSize: '11px', color: 'hsl(215, 15%, 55%)' }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExitDistributionChart;
