import SmoothChartDot from '@/components/charts/SmoothChartDot';
import SmoothChartCursor from '@/components/charts/SmoothChartCursor';
import type { CSSProperties } from 'react';

// CSS owns the interpolation so rapid pointer updates never restart JS tweens.
export const chartSeriesMotion = { isAnimationActive: false } as const;
export const chartCurveMotion = { ...chartSeriesMotion, activeDot: <SmoothChartDot /> } as const;
export const chartTooltipMotion = { isAnimationActive: false, wrapperStyle: { outline: 'none', pointerEvents: 'none' } as CSSProperties } as const;

export const chartLineCursor = <SmoothChartCursor />;
