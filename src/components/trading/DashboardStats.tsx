import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Percent, Hash, CheckCircle, XCircle, Zap, ArrowUp, ArrowDown, Repeat, Trophy, Skull, DollarSign } from 'lucide-react';
import { WidgetConfig, STAT_DEFS } from '@/hooks/useDashboardConfig';
import { WidgetColorPicker } from '@/components/trading/WidgetColorPicker';
import { X, Plus, EyeOff } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    currentBalance: number; totalProfit: number; profitPercent: number;
    maxDrawdown: number; winRate: number; totalTrades: number;
    profitFactor: number; avgRR: number; avgTrade: number;
    wins: number; losses: number; bestTrade: number;
    worstTrade: number; expectancy: number;
    longestWinStreak?: number; longestLossStreak?: number;
    avgWin?: number; avgLoss?: number;
  };
  editMode?: boolean;
  statConfigs?: WidgetConfig[];
  onStatColorChange?: (id: string, color: string) => void;
  onToggleStat?: (id: string) => void;
}

const STAT_ICONS: Record<string, React.ElementType> = {
  'stat-balance': Activity,
  'stat-total-profit': TrendingUp,
  'stat-profit-percent': Percent,
  'stat-total-trades': Hash,
  'stat-win-rate': Percent,
  'stat-profit-factor': BarChart3,
  'stat-avg-trade': Target,
  'stat-max-drawdown': TrendingDown,
  'stat-best-trade': ArrowUp,
  'stat-worst-trade': ArrowDown,
  'stat-expectancy': Zap,
  'stat-wins': CheckCircle,
  'stat-losses': XCircle,
  'stat-avg-rr': Repeat,
  'stat-longest-win': Trophy,
  'stat-longest-loss': Skull,
  'stat-avg-win': DollarSign,
  'stat-avg-loss': DollarSign,
};

function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return null;
  const winPct = (wins / total) * 100;
  return (
    <div className="mt-3 space-y-1">
      <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px">
        <div className="h-full rounded-l-full transition-all duration-500"
          style={{ width: `${winPct}%`, backgroundColor: 'hsl(142,71%,45%)', minWidth: wins > 0 ? 3 : 0 }} />
        <div className="h-full flex-1 rounded-r-full"
          style={{ backgroundColor: 'hsl(0,84%,60%)', minWidth: losses > 0 ? 3 : 0 }} />
      </div>
      <p className="text-[10px] text-muted-foreground tabular-nums">{wins}W · {losses}L</p>
    </div>
  );
}

const DashboardStats = ({ stats, editMode, statConfigs, onStatColorChange, onToggleStat }: DashboardStatsProps) => {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatValue = (key: string): string => {
    switch (key) {
      case 'currentBalance':    return `$${fmt(stats.currentBalance)}`;
      case 'totalProfit':       return `${stats.totalProfit >= 0 ? '+' : ''}$${fmt(stats.totalProfit)}`;
      case 'profitPercent':     return `${stats.profitPercent >= 0 ? '+' : ''}${stats.profitPercent.toFixed(2)}%`;
      case 'totalTrades':       return stats.totalTrades.toString();
      case 'winRate':           return `${stats.winRate.toFixed(1)}%`;
      case 'profitFactor':      return stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2);
      case 'avgTrade':          return `$${fmt(stats.avgTrade)}`;
      case 'maxDrawdown':       return `${stats.maxDrawdown.toFixed(2)}%`;
      case 'bestTrade':         return `+$${fmt(stats.bestTrade)}`;
      case 'worstTrade':        return `$${fmt(stats.worstTrade)}`;
      case 'expectancy':        return `$${fmt(stats.expectancy)}`;
      case 'wins':              return stats.wins.toString();
      case 'losses':            return stats.losses.toString();
      case 'avgRR':             return stats.avgRR.toFixed(2);
      case 'longestWinStreak':  return (stats.longestWinStreak ?? 0).toString();
      case 'longestLossStreak': return (stats.longestLossStreak ?? 0).toString();
      case 'avgWin':            return `$${fmt(stats.avgWin ?? 0)}`;
      case 'avgLoss':           return `$${fmt(stats.avgLoss ?? 0)}`;
      default: return '—';
    }
  };

  const getVariant = (key: string) => {
    switch (key) {
      case 'currentBalance':    return 'balance';
      case 'totalProfit':       return stats.totalProfit >= 0 ? 'profit' : 'loss';
      case 'profitPercent':     return stats.profitPercent >= 0 ? 'profit' : 'loss';
      case 'winRate':           return stats.winRate >= 50 ? 'profit' : 'loss';
      case 'profitFactor':      return stats.profitFactor >= 1 ? 'profit' : 'loss';
      case 'avgTrade':          return stats.avgTrade >= 0 ? 'profit' : 'loss';
      case 'maxDrawdown':       return 'drawdown';
      case 'bestTrade':         return 'profit';
      case 'worstTrade':        return 'loss';
      case 'expectancy':        return stats.expectancy >= 0 ? 'profit' : 'loss';
      case 'wins': case 'longestWinStreak': case 'avgWin': return 'profit';
      case 'losses': case 'longestLossStreak': case 'avgLoss': return 'loss';
      case 'avgRR':             return stats.avgRR >= 1 ? 'profit' : 'loss';
      default: return 'default';
    }
  };

  const getBadgeLabel = (key: string, variant: string) => {
    switch (key) {
      case 'winRate':     return `${stats.winRate.toFixed(0)}%`;
      case 'profitFactor': return stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(1);
      case 'avgRR':       return `${stats.avgRR.toFixed(1)}R`;
      case 'profitPercent': return `${stats.profitPercent >= 0 ? '+' : ''}${stats.profitPercent.toFixed(1)}%`;
      case 'maxDrawdown': return `${stats.maxDrawdown.toFixed(1)}%`;
      case 'totalTrades': return `${stats.wins}W/${stats.losses}L`;
      default: return null;
    }
  };

  const variantStyles: Record<string, { card: string; value: string; badge: string; badgeBg: string }> = {
    profit:   { card: 'border-[hsl(142_71%_45%/0.18)]', value: 'text-profit',   badge: 'text-profit',   badgeBg: 'bg-[hsl(142_71%_45%/0.12)]' },
    loss:     { card: 'border-[hsl(0_84%_60%/0.18)]',   value: 'text-loss',     badge: 'text-loss',     badgeBg: 'bg-[hsl(0_84%_60%/0.12)]' },
    balance:  { card: 'border-[hsl(246_90%_63%/0.18)]', value: 'text-balance',  badge: 'text-balance',  badgeBg: 'bg-[hsl(246_90%_63%/0.12)]' },
    drawdown: { card: 'border-[hsl(25_95%_53%/0.18)]',  value: 'text-drawdown', badge: 'text-drawdown', badgeBg: 'bg-[hsl(25_95%_53%/0.12)]' },
    default:  { card: 'border-border/60',                value: 'text-foreground', badge: 'text-muted-foreground', badgeBg: 'bg-secondary' },
  };

  const visibleStats = statConfigs
    ? STAT_DEFS.filter(s => { const cfg = statConfigs.find(c => c.id === s.id); return cfg ? cfg.visible : true; })
    : STAT_DEFS.filter(s => !['stat-avg-rr', 'stat-longest-win', 'stat-longest-loss', 'stat-avg-win', 'stat-avg-loss'].includes(s.id));

  const hiddenStats = statConfigs
    ? STAT_DEFS.filter(s => { const cfg = statConfigs.find(c => c.id === s.id); return cfg ? !cfg.visible : false; })
    : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {visibleStats.map(stat => {
          const cfg = statConfigs?.find(c => c.id === stat.id);
          const variant = getVariant(stat.key) as keyof typeof variantStyles;
          const styles = variantStyles[variant] || variantStyles.default;
          const Icon = STAT_ICONS[stat.id] || Activity;
          const badgeLabel = getBadgeLabel(stat.key, variant);
          const hasCustomColor = !!cfg?.color;

          const cardStyle = hasCustomColor ? {
            borderColor: cfg!.color!.replace('hsl(', 'hsla(').replace(')', ', 0.25)'),
            backgroundColor: cfg!.color!.replace('hsl(', 'hsla(').replace(')', ', 0.06)'),
          } : undefined;

          return (
            <div key={stat.id}
              className={`rounded-2xl p-4 border bg-card relative group animate-fade-in transition-colors ${
                !hasCustomColor ? styles.card : 'border-border/60'
              } ${editMode ? 'ring-1 ring-primary/15' : ''}`}
              style={cardStyle}>

              {/* Top row: label + icon */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.07em] leading-tight">
                  {stat.label}
                </span>
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${!hasCustomColor ? styles.badgeBg : 'bg-secondary'}`}>
                  <Icon className={`h-3 w-3 ${!hasCustomColor ? styles.badge : 'text-muted-foreground'}`} />
                </div>
              </div>

              {/* Main value */}
              <p className={`text-xl font-bold font-mono leading-none ${!hasCustomColor ? styles.value : 'text-foreground'}`}>
                {getStatValue(stat.key)}
              </p>

              {/* Badge or win-loss bar */}
              {stat.id === 'stat-total-trades' ? (
                <WinLossBar wins={stats.wins} losses={stats.losses} />
              ) : badgeLabel && (
                <div className={`mt-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${!hasCustomColor ? `${styles.badgeBg} ${styles.badge}` : 'bg-secondary text-muted-foreground'}`}>
                  {variant === 'profit' && <TrendingUp className="h-2.5 w-2.5" />}
                  {variant === 'loss' && <TrendingDown className="h-2.5 w-2.5" />}
                  {badgeLabel}
                </div>
              )}

              {/* Edit controls */}
              {editMode && (
                <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {onStatColorChange && cfg && (
                    <WidgetColorPicker color={cfg.color} onChange={(c) => onStatColorChange(stat.id, c)} />
                  )}
                  {onToggleStat && (
                    <button onClick={() => onToggleStat(stat.id)}
                      className="p-0.5 rounded hover:bg-destructive/20 transition-colors">
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editMode && hiddenStats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-dashed border-border/50 bg-secondary/20">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider self-center mr-2">
            <EyeOff className="h-3 w-3 inline mr-1" />Hidden:
          </span>
          {hiddenStats.map(s => (
            <button key={s.id} onClick={() => onToggleStat?.(s.id)}
              className="inline-flex items-center gap-1 h-6 px-2 text-[10px] rounded-lg border border-border/60 bg-card hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <Plus className="h-2.5 w-2.5" />{s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
