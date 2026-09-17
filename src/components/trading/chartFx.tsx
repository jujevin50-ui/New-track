import React from 'react';

/* ── Shared futuristic chart effects ─────────────────────────────────
   Glassmorphism tooltip, neon glow SVG filter, pulsing "live" end-dot,
   and hover cursors — used by every dashboard chart. */

export const glassTooltip: React.CSSProperties = {
  backgroundColor: 'hsla(240, 18%, 7%, 0.8)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid hsla(255, 92%, 68%, 0.25)',
  borderRadius: '14px',
  fontSize: '12px',
  boxShadow: '0 12px 40px hsla(0, 0%, 0%, 0.55), 0 0 24px hsla(255, 92%, 68%, 0.1)',
  color: 'hsl(0, 0%, 96%)',
  padding: '10px 14px',
};

export const tooltipLabelStyle: React.CSSProperties = {
  color: 'hsl(215, 15%, 65%)',
  fontWeight: 600,
  marginBottom: 4,
};

export const tooltipItemStyle: React.CSSProperties = { color: 'hsl(0, 0%, 96%)' };

export const lineCursor = { stroke: 'hsla(255, 92%, 68%, 0.35)', strokeWidth: 1, strokeDasharray: '4 4' };
export const barCursor = { fill: 'hsla(255, 92%, 68%, 0.06)' };

/** Neon glow — place inside <defs>, apply with filter={`url(#id)`} */
export const Glow = ({ id, strength = 3.5 }: { id: string; strength?: number }) => (
  <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation={strength} result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

/** Pulsing dot rendered only on a series' last point — marks "now" */
export const makePulseDot = (lastIndex: number, color: string) =>
  (props: any) => {
    const { cx, cy, index } = props;
    if (index !== lastIndex || cx == null || cy == null) return <g key={`pd-${index}`} />;
    return (
      <g key={`pd-${index}`}>
        <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.2}>
          <animate attributeName="r" values="4;13;4" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="hsl(240, 18%, 8%)" strokeWidth={1.5} />
      </g>
    );
  };
