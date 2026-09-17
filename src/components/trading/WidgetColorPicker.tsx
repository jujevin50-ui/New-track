import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Palette } from 'lucide-react';
import { PRESET_COLORS } from '@/hooks/useDashboardConfig';

interface WidgetColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export const WidgetColorPicker = ({ color, onChange }: WidgetColorPickerProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button className="no-drag p-1 rounded hover:bg-accent/50 transition-colors" title="Couleur">
        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="no-drag w-auto p-3" side="bottom" align="end">
      <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Couleur des courbes</p>
      <div className="grid grid-cols-5 gap-1.5">
        {PRESET_COLORS.map(c => (
          <button
            key={c.name}
            onClick={() => onChange(c.value)}
            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
              color === c.value ? 'border-primary ring-1 ring-primary/50' : 'border-border'
            }`}
            style={{ backgroundColor: c.value || 'hsl(var(--muted-foreground))' }}
            title={c.name}
          />
        ))}
      </div>
    </PopoverContent>
  </Popover>
);
