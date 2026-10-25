import React from 'react';

/* ── Shared "trading terminal" chart effects ─────────────────────────
   Clean, low-noise tooltip and hover cursors — used by every dashboard
   chart. Kept deliberately sober: solid surface, thin border, minimal
   shadow, no neon/glow — closer to a professional analytics terminal. */

export const glassTooltip: React.CSSProperties = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: 'var(--shadow-pop)',
  color: 'hsl(var(--popover-foreground))',
  padding: '10px 14px',
};

export const tooltipLabelStyle: React.CSSProperties = {
  color: 'hsl(var(--muted-foreground))',
  fontWeight: 500,
  fontSize: 11,
  marginBottom: 4,
};

export const tooltipItemStyle: React.CSSProperties = { color: 'hsl(var(--popover-foreground))', fontWeight: 600 };

export const lineCursor = { stroke: 'hsl(var(--muted-foreground) / 0.35)', strokeWidth: 1, strokeDasharray: '3 3' };
export const barCursor = { fill: 'hsl(var(--muted-foreground) / 0.08)' };

const AXIS_FONT = 'Inter, system-ui, sans-serif';

/** Grille horizontale seule, très discrète (style Finary). */
export const gridProps = {
  stroke: 'hsl(var(--border))',
  strokeWidth: 1,
  strokeDasharray: '0',
  vertical: false,
};

export const axisTick = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
  fontWeight: 400,
  fontFamily: AXIS_FONT,
};

export const catAxisTick = {
  fontSize: 12,
  fill: 'hsl(var(--muted-foreground))',
  fontWeight: 400,
  fontFamily: AXIS_FONT,
};

export const chartMargin = { top: 12, right: 8, left: 0, bottom: 4 };

/** Neutral value-label style for on-chart numbers: always gray, never bold. */
export const valueLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  fill: 'hsl(var(--muted-foreground))',
  color: 'hsl(var(--muted-foreground))',
  // Sans ça, le texte hérite du contour (stroke) coloré des barres/points.
  stroke: 'none',
  strokeWidth: 0,
};

export const zeroLine = { stroke: 'hsl(var(--muted-foreground) / 0.45)', strokeWidth: 1 };

export const medianLineStyle = (color?: string) => ({
  stroke: color || 'hsl(38,92%,50%)',
  strokeWidth: 1,
  strokeDasharray: '4 4',
  strokeOpacity: 0.75,
});

/** Plus d'effet néon : filtre neutre (conservé pour ne pas toucher aux graphiques existants). */
export const Glow = ({ id }: { id: string; strength?: number }) => (
  <filter id={id}>
    <feMerge>
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
        <circle cx={cx} cy={cy} r={3} fill={color} stroke="hsl(var(--card))" strokeWidth={1.5} />
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
          <circle cx={cx} cy={cy} r={4} fill={color} stroke="hsl(var(--card))" strokeWidth={1.5} />
        </g>
      );
    }
    if (index < 0 || index > lastIndex) return <g key={`tp-${index}`} />;

    const val = data[index]?.[key];
    if (val == null) return <g key={`tp-${index}`} />;

    return <circle key={`tp-${index}`} cx={cx} cy={cy} r={3.5} fill={color} stroke="hsl(var(--card))" strokeWidth={1.3} />;
  };
