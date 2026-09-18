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

/**
 * Kept for backwards compatibility with chart files that still apply
 * `filter={url(#id)}`. Strength is reduced to near-zero so lines render
 * crisp and flat instead of glowing — a subtle, professional finish.
 */
export const Glow = ({ id, strength = 0.6 }: { id: string; strength?: number }) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation={strength} result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

/** Static end-of-series marker — no pulse/animation, just a clean ring */
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
