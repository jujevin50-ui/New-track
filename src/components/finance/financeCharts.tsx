import { useId, useMemo } from 'react';
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, ReferenceDot, Cell, LabelList, PieChart, Pie, Legend,
} from 'recharts';
import { niceTicks, niceDomain } from '@/lib/chartTicks';
import {
  glassTooltip, tooltipLabelStyle, tooltipItemStyle, lineCursor, barCursor, Glow, makePulseDot,
  makeTurningPointDots, gridProps, axisTick, catAxisTick, chartMargin, zeroLine, valueLabelStyle, medianLineStyle,
} from '@/components/trading/chartFx';

/* ── Graphiques My Finance : même style que la partie trading ───────────
   (grille discrète, axes monospace sans traits, tooltip sombre, dégradés + glow) */

export const PROFIT = 'hsl(var(--chart-profit))';
export const LOSS = 'hsl(var(--chart-loss))';
export const ACCENT = 'hsl(var(--primary))';
export const BLUE = 'hsl(var(--primary))';
export const AMBER = 'hsl(38, 92%, 50%)';
/** Palette catégories : douce, lisible en clair comme en sombre. */
export const PALETTE = [
  'hsl(244, 76%, 62%)', 'hsl(160, 60%, 42%)', 'hsl(38, 92%, 52%)', 'hsl(350, 80%, 60%)',
  'hsl(199, 89%, 52%)', 'hsl(275, 70%, 62%)', 'hsl(180, 60%, 40%)', 'hsl(220, 12%, 58%)',
];

export const fmtEur = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const tickEur = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} €`;

const legendStyle = { fontSize: '12px', color: 'hsl(var(--muted-foreground))' };
const darkRing = 'hsl(var(--card))';

/** Domaine + graduations "rondes" comme dans les graphiques trading. */
function domainFor(values: number[], includeZero: boolean, pad = 0.15) {
  const vals = values.filter(v => Number.isFinite(v));
  if (!vals.length) return { domain: [0, 1] as [number, number], ticks: [0, 1] };
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (includeZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const spread = hi - lo || Math.abs(hi) * 0.02 || 1;
  const d = niceDomain(lo - (includeZero && lo === 0 ? 0 : spread * pad), hi + spread * (includeZero ? 0.08 : pad));
  return { domain: d, ticks: niceTicks(d[0], d[1]) };
}

const tooltipCommon = { contentStyle: glassTooltip, labelStyle: tooltipLabelStyle, itemStyle: tooltipItemStyle };
const xAxisProps = { tick: axisTick, tickLine: false, axisLine: false } as const;
const yAxisProps = { tick: axisTick, tickLine: false, axisLine: false, width: 64, tickFormatter: tickEur } as const;

function areaStops(id: string, color: string) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.22} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">{text}</div>
);

/* ───────────── Flux du mois : cumul revenus − dépenses ───────────── */
export function FlowAreaChart({ data, lastIndex }: { data: { day: string; net: number | null }[]; lastIndex: number }) {
  const uid = useId();
  const vals = data.map(d => d.net).filter((v): v is number => v != null);
  const last = vals.length ? vals[vals.length - 1] : 0;
  const color = last >= 0 ? PROFIT : LOSS;
  const { domain, ticks } = useMemo(() => domainFor(vals, true), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastPoint = data[lastIndex];
  if (!data.length) return <Empty text="Aucune donnée" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={chartMargin}>
        <defs>
          <Glow id={`glow-${uid}`} />
          {areaStops(`flow-${uid}`, color)}
        </defs>
        <CartesianGrid {...gridProps} />
        <ReferenceLine y={0} {...zeroLine} />
        <XAxis dataKey="day" {...xAxisProps} interval="preserveStartEnd" minTickGap={14} />
        <YAxis domain={domain} ticks={ticks} {...yAxisProps} />
        <Tooltip cursor={lineCursor} {...tooltipCommon} labelFormatter={(l: any) => `Jour ${l}`} formatter={(v: number) => [fmtEur(v), 'Net cumulé']} />
        <Area type="monotone" dataKey="net" stroke={color} fill={`url(#flow-${uid})`} strokeWidth={2.5}
          dot={makePulseDot(lastIndex, color)} activeDot={{ r: 4, fill: color, stroke: color, strokeWidth: 2 }} connectNulls={false} />
        {lastPoint?.net != null && (
          <ReferenceDot x={lastPoint.day} y={lastPoint.net} r={0} label={{ value: tickEur(lastPoint.net), position: 'top', ...valueLabelStyle } as any} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ───────────── Flux de l'année : revenus / dépenses par mois ───────────── */
export function YearFlowBars({ data }: { data: { month: string; income: number; expenses: number }[] }) {
  const uid = useId();
  const { domain, ticks } = useMemo(() => domainFor(data.flatMap(d => [d.income, d.expenses]), true, 0.05), [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={chartMargin}>
        <defs>
          <Glow id={`glow-${uid}`} strength={0.7} />
          <linearGradient id={`inc-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PROFIT} stopOpacity={1} />
            <stop offset="100%" stopColor={PROFIT} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id={`exp-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LOSS} stopOpacity={1} />
            <stop offset="100%" stopColor={LOSS} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <ReferenceLine y={0} {...zeroLine} />
        <XAxis dataKey="month" {...xAxisProps} />
        <YAxis domain={domain} ticks={ticks} {...yAxisProps} />
        <Tooltip cursor={barCursor} {...tooltipCommon} formatter={(v: number, name: string) => [fmtEur(v), name]} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        <Bar dataKey="income" name="Revenus" fill={`url(#inc-${uid})`} radius={[6, 6, 0, 0]} barSize={12} />
        <Bar dataKey="expenses" name="Dépenses" fill={`url(#exp-${uid})`} radius={[6, 6, 0, 0]} barSize={12} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ───────────── Cash-flow mensuel (courbe type equity) ───────────── */
export function CashflowChart({ data }: { data: { month: string; cashflow: number }[] }) {
  const uid = useId();
  const color = ACCENT;
  const { domain, ticks } = useMemo(() => domainFor(data.map(d => d.cashflow), true), [data]);
  const lastPoint = data[data.length - 1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={chartMargin}>
        <defs>
          <Glow id={`glow-${uid}`} />
          {areaStops(`cf-${uid}`, color)}
        </defs>
        <CartesianGrid {...gridProps} />
        <ReferenceLine y={0} {...zeroLine} />
        <XAxis dataKey="month" {...xAxisProps} />
        <YAxis domain={domain} ticks={ticks} {...yAxisProps} />
        <Tooltip cursor={lineCursor} {...tooltipCommon} formatter={(v: number) => [fmtEur(v), 'Cash-flow']} />
        <Area type="monotone" dataKey="cashflow" stroke={color} fill={`url(#cf-${uid})`} strokeWidth={2.5}
          dot={makeTurningPointDots(data, 'cashflow', color)} activeDot={{ r: 4, fill: color, stroke: color, strokeWidth: 2 }} />
        {lastPoint && (
          <ReferenceDot x={lastPoint.month} y={lastPoint.cashflow} r={0} label={{ value: tickEur(lastPoint.cashflow), position: 'top', ...valueLabelStyle } as any} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ───────────── Donut (répartition) ───────────── */
export function Donut({ data, centerLabel, colors = PALETTE }: { data: { name: string; value: number }[]; centerLabel: string; colors?: string[] }) {
  const uid = useId();
  const filtered = data.map((d, i) => ({ ...d, _i: i })).filter(d => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);
  if (!filtered.length) return <Empty text="Aucune donnée" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <defs><Glow id={`glow-${uid}`} strength={4} /></defs>
        <Pie data={filtered} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="72%" outerRadius="96%" strokeWidth={0} paddingAngle={filtered.length > 1 ? 3 : 0} cornerRadius={6}>
          {filtered.map((d, i) => <Cell key={i} fill={colors[d._i % colors.length]} />)}
        </Pie>
        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 18, fontWeight: 700, fill: 'hsl(var(--foreground))', fontFamily: 'inherit' }}>
          {tickEur(total)}
        </text>
        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}>
          {centerLabel}
        </text>
        <Tooltip cursor={false} contentStyle={glassTooltip} itemStyle={tooltipItemStyle}
          formatter={(v: number, name: string) => [`${fmtEur(v)} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ───────────── Barres horizontales (soldes par compte) ───────────── */
export function AccountBars({ data }: { data: { name: string; balance: number }[] }) {
  const uid = useId();
  const sorted = useMemo(() => [...data].sort((a, b) => b.balance - a.balance), [data]);
  const { domain, ticks } = useMemo(() => {
    const d = niceDomain(Math.min(...sorted.map(x => x.balance), 0), Math.max(...sorted.map(x => x.balance), 0) * 1.18 || 1);
    return { domain: d, ticks: niceTicks(d[0], d[1]) };
  }, [sorted]);
  if (!sorted.length) return <Empty text="Aucune donnée" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={sorted} layout="vertical" margin={{ top: 10, right: 36, left: 5, bottom: 5 }}>
        <defs>
          <Glow id={`glow-${uid}`} strength={0.7} />
          <linearGradient id={`pos-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.55} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={1} />
          </linearGradient>
          <linearGradient id={`neg-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={LOSS} stopOpacity={1} />
            <stop offset="100%" stopColor={LOSS} stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <ReferenceLine x={0} {...zeroLine} />
        <XAxis type="number" domain={domain} ticks={ticks} {...xAxisProps} tickFormatter={tickEur} />
        <YAxis dataKey="name" type="category" tick={catAxisTick} tickLine={false} axisLine={false} width={100} />
        <Tooltip cursor={barCursor} {...tooltipCommon} formatter={(v: number) => [fmtEur(v), 'Solde']} />
        <Bar dataKey="balance" radius={[0, 8, 8, 0]} barSize={14}>
          <LabelList dataKey="balance" position="right" formatter={(v: number) => tickEur(v)} style={valueLabelStyle} />
          {sorted.map((e, i) => (
            <Cell key={i} fill={e.balance >= 0 ? `url(#pos-${uid})` : `url(#neg-${uid})`} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ───────────── Valeur d'un compte dans le temps (relevés) ───────────── */
export function ValueAreaChart({ data, initialCapital }: {
  data: { label: string; value: number; deposited: number | null }[];
  initialCapital?: number | null;
}) {
  const uid = useId();
  const color = ACCENT;
  const hasDeposits = data.some(d => d.deposited != null);
  const { domain, ticks } = useMemo(
    () => domainFor([...data.map(d => d.value), ...data.map(d => d.deposited ?? NaN), initialCapital ?? NaN], false),
    [data, initialCapital],
  );
  const lastPoint = data[data.length - 1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={chartMargin}>
        <defs>
          <Glow id={`glow-${uid}`} />
          {areaStops(`val-${uid}`, color)}
        </defs>
        <CartesianGrid {...gridProps} />
        {initialCapital != null && (
          <ReferenceLine y={initialCapital} {...medianLineStyle(AMBER)} label={{ value: 'Capital initial', position: 'insideTopLeft', ...valueLabelStyle } as any} />
        )}
        <XAxis dataKey="label" {...xAxisProps} />
        <YAxis domain={domain} ticks={ticks} {...yAxisProps} />
        <Tooltip cursor={lineCursor} {...tooltipCommon} formatter={(v: number, name: string) => [fmtEur(v), name]} />
        {hasDeposits && <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />}
        <Area type="monotone" dataKey="value" name="Valeur" stroke={color} fill={`url(#val-${uid})`} strokeWidth={2.5}
          dot={makeTurningPointDots(data, 'value', color)} activeDot={{ r: 4, fill: color, stroke: color, strokeWidth: 2 }} />
        {hasDeposits && (
          <Line type="monotone" dataKey="deposited" name="Capital versé" {...medianLineStyle(BLUE)} strokeOpacity={1} strokeWidth={1.5}
            dot={{ r: 2.5, fill: BLUE, stroke: darkRing, strokeWidth: 1.2 }} connectNulls />
        )}
        {lastPoint && (
          <ReferenceDot x={lastPoint.label} y={lastPoint.value} r={0} label={{ value: tickEur(lastPoint.value), position: 'top', ...valueLabelStyle } as any} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ───────────── Courbes multiples (comptes / actifs) ───────────── */
export function MultiLineChart({ rows, series }: {
  rows: Record<string, any>[];
  series: { key: string; color: string; strong?: boolean }[];
}) {
  const uid = useId();
  const { domain, ticks } = useMemo(
    () => domainFor(rows.flatMap(r => series.map(s => (typeof r[s.key] === 'number' ? r[s.key] : NaN))), false, 0.1),
    [rows, series],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={chartMargin}>
        <defs><Glow id={`glow-${uid}`} /></defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...xAxisProps} />
        <YAxis domain={domain} ticks={ticks} {...yAxisProps} />
        <Tooltip cursor={lineCursor} {...tooltipCommon} formatter={(v: number, name: string) => [fmtEur(v), name]} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        {series.map(s => (
          <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={s.strong ? 2.5 : 1.75}
            filter={s.strong ? `url(#glow-${uid})` : undefined}
            dot={{ r: s.strong ? 3.5 : 2.5, fill: s.color, stroke: darkRing, strokeWidth: 1.2 }}
            activeDot={{ r: 4, fill: s.color, stroke: s.color, strokeWidth: 2 }} connectNulls />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
