import { useId } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { glassTooltip, tooltipLabelStyle, tooltipItemStyle, Glow } from './chartFx';

export interface RadarMetric {
  metric: string;
  value: number; // normalized 0-100, drives the shape
  raw: string;   // human-readable actual value, shown in tooltip
}

interface Props {
  data: RadarMetric[];
  accentColor?: string;
}

const PerformanceRadarChart = ({ data, accentColor }: Props) => {
  const uid = useId();
  const color = accentColor || 'hsl(255, 92%, 68%)';

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Ajoutez des trades pour voir votre profil de performance
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
        <defs>
          <Glow id={`glow-${uid}`} strength={4} />
          <radialGradient id={`radarFill-${uid}`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.06} />
          </radialGradient>
        </defs>
        <PolarGrid stroke="hsla(215,15%,55%,0.18)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsla(215, 15%, 65%, 0.85)' }} />
        <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#radarFill-${uid})`}
          fillOpacity={1}
          filter={`url(#glow-${uid})`}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
        <Tooltip
          contentStyle={glassTooltip}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(_value: number, _name: string, entry: any) => [entry.payload.raw, entry.payload.metric]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default PerformanceRadarChart;
