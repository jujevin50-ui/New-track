import type { ReactNode } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Banknote, Briefcase, Car, CandlestickChart, GraduationCap, Gamepad2, HeartPulse,
  Home, MoreHorizontal, Percent, Receipt, Repeat2, ShoppingBag, ShoppingBasket, Tag, Undo2, Users, Inbox,
} from 'lucide-react';
import { PALETTE } from './financeCharts';

/* ── Briques d'interface de My Finance (DA type Finary) ───────────────────
   Cartes blanches à bordure fine, pastilles d'icônes teintées, segmented control clair. */

export const eur = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const eurShort = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('fr-FR')} €`;

/** Icône + couleur par catégorie (dépenses et revenus). */
export const CATEGORY_META: Record<string, { icon: typeof Home; color: string }> = {
  Logement: { icon: Home, color: PALETTE[0] },
  Alimentation: { icon: ShoppingBasket, color: PALETTE[1] },
  Transport: { icon: Car, color: PALETTE[4] },
  Abonnements: { icon: Repeat2, color: PALETTE[5] },
  Loisirs: { icon: Gamepad2, color: PALETTE[2] },
  Shopping: { icon: ShoppingBag, color: PALETTE[3] },
  Santé: { icon: HeartPulse, color: PALETTE[6] },
  Formation: { icon: GraduationCap, color: PALETTE[0] },
  Trading: { icon: CandlestickChart, color: PALETTE[1] },
  Famille: { icon: Users, color: PALETTE[5] },
  Impôts: { icon: Receipt, color: PALETTE[7] },
  Salaire: { icon: Briefcase, color: PALETTE[1] },
  Payout: { icon: Banknote, color: PALETTE[1] },
  Remboursement: { icon: Undo2, color: PALETTE[4] },
  Intérêts: { icon: Percent, color: PALETTE[4] },
  Vente: { icon: Tag, color: PALETTE[2] },
  Autre: { icon: MoreHorizontal, color: PALETTE[7] },
};
export const categoryMeta = (name: string) => CATEGORY_META[name] ?? CATEGORY_META.Autre;

/** Pastille carrée teintée (fond = couleur à ~14 %, icône = couleur pleine). */
export function Tile({ color, children, size = 'md' }: { color: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-xl';
  return (
    <span className={`${dim} shrink-0 inline-flex items-center justify-center`} style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      {children}
    </span>
  );
}

export function CategoryTile({ category, color, size }: { category: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = categoryMeta(category);
  const Icon = meta.icon;
  return <Tile color={color ?? meta.color} size={size}><Icon className="h-[18px] w-[18px]" /></Tile>;
}

export function Card({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`surface p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Indicateur clé : pastille d'icône, libellé, gros montant, mention optionnelle. */
export function Stat({ label, value, icon, color, hint, children }: { label: string; value: string; icon: ReactNode; color: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2.5">
        <Tile color={color} size="sm">{icon}</Tile>
        <span className="text-[13px] text-muted-foreground">{label}</span>
      </div>
      <p className="font-mono text-[26px] leading-none font-semibold tracking-tight mt-4">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
      {children}
    </div>
  );
}

/** Variation : pastille verte / rouge avec flèche. */
export function DeltaPill({ value, label }: { value: number; label: string }) {
  const up = value >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 h-7 pl-2 pr-2.5 rounded-full text-[13px] font-semibold ${up ? 'bg-profit-soft text-profit' : 'bg-loss-soft text-loss'}`}>
      <Arrow className="h-3.5 w-3.5" />{label}
    </span>
  );
}

/** Segmented control clair : fond gris, option active en carte blanche. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="tablist" className="inline-flex items-center gap-0.5 p-1 rounded-full bg-secondary w-fit">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`h-8 px-4 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${value === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="h-full min-h-[120px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground text-center py-6">
      {icon ?? <Inbox className="h-5 w-5 opacity-60" />}
      <span>{text}</span>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/** Barre de répartition empilée (liquidités / investissements / autres). */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const positive = parts.filter(p => p.value > 0);
  const total = positive.reduce((s, p) => s + p.value, 0);
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5">
        {positive.map(p => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={p.label} />)}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
        {positive.map(p => (
          <div key={p.label} className="flex items-center gap-2 text-[13px]">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.label}</span>
            <span className="font-mono font-semibold">{eurShort(p.value)}</span>
            <span className="text-xs text-muted-foreground">{Math.round((p.value / total) * 100)} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}
