import { useDailyJournal } from '@/hooks/useDailyJournal';
import { Smile, Meh, Frown, Heart, AlertTriangle } from 'lucide-react';

const moodIcon = (mood: string) => {
  if (mood === 'excellent') return { Icon: Heart, color: 'hsl(142, 71%, 45%)' };
  if (mood === 'good') return { Icon: Smile, color: 'hsl(160, 70%, 50%)' };
  if (mood === 'neutral') return { Icon: Meh, color: 'hsl(215, 15%, 60%)' };
  if (mood === 'bad') return { Icon: Frown, color: 'hsl(25, 95%, 53%)' };
  return { Icon: AlertTriangle, color: 'hsl(0, 84%, 60%)' };
};

const DailyJournalWidget = ({ accentColor }: { accentColor?: string }) => {
  const { getJournal } = useDailyJournal();
  const today = new Date().toISOString().split('T')[0];
  const journal = getJournal(today);

  if (!journal) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
        <span>No journal entry today</span>
        <span className="text-[10px] opacity-70">{today}</span>
      </div>
    );
  }

  const { Icon, color } = moodIcon(journal.mood);
  const c = accentColor || color;

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" style={{ color: c }} />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{journal.mood}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="px-2 py-1.5 rounded-md border border-border/60 bg-secondary/30">
          <div className="text-[9px] uppercase text-muted-foreground tracking-wider">Discipline</div>
          <div className="text-sm font-bold" style={{ color: c }}>{journal.discipline}/5</div>
        </div>
        <div className="px-2 py-1.5 rounded-md border border-border/60 bg-secondary/30">
          <div className="text-[9px] uppercase text-muted-foreground tracking-wider">Confidence</div>
          <div className="text-sm font-bold" style={{ color: c }}>{journal.confidence}/5</div>
        </div>
      </div>
      {journal.notes && (
        <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">{journal.notes}</p>
      )}
    </div>
  );
};

export default DailyJournalWidget;
