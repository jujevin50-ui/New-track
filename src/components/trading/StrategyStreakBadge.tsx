import { Flame } from 'lucide-react';
import { useStrategyStreak } from '@/hooks/useStrategyStreak';

export function StrategyStreakBadge() {
  const streak = useStrategyStreak();
  const flameSize = Math.min(14 + streak * 1.5, 32);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
      <Flame
        className="text-[hsl(25,95%,53%)] transition-all duration-300 shrink-0"
        style={{ width: flameSize, height: flameSize }}
        fill={streak > 0 ? 'hsl(25,95%,53%)' : 'none'}
      />
      <span className="text-xs font-bold font-mono">{streak}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">day{streak !== 1 ? 's' : ''} respected</span>
    </div>
  );
}
