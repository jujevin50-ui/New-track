import { useMemo } from 'react';
import { useWeeklyReport, getWeekKey } from '@/hooks/useWeeklyReport';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StickyNote } from 'lucide-react';

const PostItWidget = () => {
  const { reports } = useWeeklyReport();

  const conclusions = useMemo(() => {
    return Object.values(reports)
      .filter(r => r.conclusion?.trim())
      .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  }, [reports]);

  if (conclusions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <StickyNote className="h-5 w-5" />
        <span className="text-xs">Aucune conclusion de bilan</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-2">
      <div className="space-y-3">
        {conclusions.map((r, i) => (
          <div
            key={r.weekKey}
            className="rounded-lg p-3 border border-border/50"
            style={{ backgroundColor: 'hsl(var(--accent) / 0.3)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                {r.weekKey}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {r.conclusion}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default PostItWidget;
