import { usePendingOrders } from '@/hooks/usePendingOrders';
import { Clock } from 'lucide-react';

const PendingOrdersWidget = ({ accentColor }: { accentColor?: string }) => {
  const { pendingOrders } = usePendingOrders('all');
  const color = accentColor || 'hsl(38, 92%, 50%)';

  if (pendingOrders.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
        No pending orders
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pr-1 space-y-1.5">
      {pendingOrders.map(o => (
        <div
          key={o.id}
          className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border"
          style={{ borderColor: `${color}40`, backgroundColor: `${color}12` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            <span className="text-[12px] font-semibold truncate">{o.pair}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{o.type}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{o.date}</span>
        </div>
      ))}
    </div>
  );
};

export default PendingOrdersWidget;
