import React from 'react';

/* ── Shared "trading terminal" chart effects ─────────────────────────
   Clean, low-noise tooltip and hover cursors — used by every dashboard
   chart. Kept deliberately sober: solid surface, thin border, minimal
   shadow, no neon/glow — closer to a professional analytics terminal. */

export const glassTooltip: React.CSSProperties = {
  backgroundColor: 'hsl(240, 12%, 9%)',
  border: '1px solid hsla(0, 0%, 100%, 0.1)',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 16px hsla(0, 0%, 0%, 0.35)',
  color: 'hsl(0, 0%, 96%)',
  padding: '8px 12px',
};

export const tooltipLabelStyle: React.CSSProperties = {
  color: 'hsl(215, 15%, 65%)',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 4,
};

export const tooltipItemStyle: React.CSSProperties = { color: 'hsl(0, 0%, 96%)', fontWeight: 600 };

export const lineCursor = { stroke: 'hsla(215, 15%, 55%, 0.3)', strokeWidth: 1, strokeDasharray: '3 3' };
export const barCursor = { fill: 'hsla(215, 15%, 55%, 0.06)' };

const AXIS_FONT = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export const gridProps = {
  stroke: 'hsla(215,15%,50%,0.12)',
  strokeWidth: 1,
  vertical: true,
};

export const axisTick = {
  fontSize: 10,
  fill: 'hsl(215, 15%, 65%)',
  fontWeight: 400,
  fontFamily: AXIS_FONT,
};

export const catAxisTick = {
  fontSize: 11,
  fill: 'hsl(215, 15%, 65%)',
  fontWeight: 400,
  fontFamily: AXIS_FONT,
};

export const chartMargin = { top: 12, right: 8, left: 0, bottom: 4 };

/** Neutral value-label style for on-chart numbers: always gray, never bold. */
export const valueLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 400,
  fill: 'hsl(215, 15%, 65%)',
  color: 'hsl(215, 15%, 65%)',
};

export const zeroLine = { stroke: 'hsla(215,15%,55%,0.4)', strokeWidth: 1 };

export const medianLineStyle = (color?: string) => ({
  stroke: color || 'hsl(38,92%,50%)',
  strokeWidth: 1,
  strokeDasharray: '4 4',
  strokeOpacity: 0.75,
});

export const Glow = ({ id, strength = 0.6 }: { id: string; strength?: number }) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation={strength} result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

export const makePulseDot = (lastIndex: number, color: string) =>
  (props: any) => {
    const { cx, cy, index } = props;
    if (index !== lastIndex || cx == null || cy == null) return <g key={`pd-${index}`} />;
    return (
      <g key={`pd-${index}`}>
        <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.15} />
        <circle cx={cx} cy={cy} r={3} fill={color} stroke="hsl(240, 12%, 9%)" strokeWidth={1.5} />
      </g>
    );
  };

export const makeTurningPointDots = (data: Array<Record<string, any>>, key: string, color: string, showLastHighlight: boolean = true) =>
  (props: any) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null) return <g key={`tp-${index}`} />;

    const lastIndex = data.length - 1;
    if (showLastHighlight && index === lastIndex) {
      return (
        <g key={`tp-${index}`}>
          <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.18} />
          <circle cx={cx} cy={cy} r={4} fill={color} stroke="hsl(240, 12%, 9%)" strokeWidth={1.5} />
        </g>
      );
    }
    if (index < 0 || index > lastIndex) return <g key={`tp-${index}`} />;

    const val = data[index]?.[key];
    if (val == null) return <g key={`tp-${index}`} />;

    return <circle key={`tp-${index}`} cx={cx} cy={cy} r={3.5} fill={color} stroke="hsl(240, 12%, 9%)" strokeWidth={1.3} />;
  };
