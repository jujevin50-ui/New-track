import SmoothChartDot from '@/components/charts/SmoothChartDot';
import SmoothChartCursor from '@/components/charts/SmoothChartCursor';
import type { CSSProperties } from 'react';

// CSS owns the interpolation so rapid pointer updates never restart JS tweens.
export const chartSeriesMotion = { isAnimationActive: false } as const;
export const chartCurveMotion = { ...chartSeriesMotion, activeDot: <SmoothChartDot /> } as const;
export const chartTooltipSurface: CSSProperties = { background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '12px 16px', fontSize: 12, boxShadow: '0 2px 8px hsl(0 0% 0% / 0.08)' };
export const chartTooltipMotion = { contentStyle: chartTooltipSurface, labelStyle: { color: 'hsl(var(--popover-foreground))', fontWeight: 500, marginBottom: 8 }, itemStyle: { color: 'hsl(var(--popover-foreground))' }, isAnimationActive: false, wrapperStyle: { outline: 'none', pointerEvents: 'none' } as CSSProperties } as const;

export const chartLineCursor = <SmoothChartCursor />;
