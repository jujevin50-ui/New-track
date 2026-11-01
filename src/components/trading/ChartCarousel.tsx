import { useState, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ChartSlide {
  id: string;
  title: string;
  content: ReactNode;
}

interface ChartCarouselProps {
  slides: ChartSlide[];
  height?: number;
  className?: string;
}

/**
 * Un seul widget : flèches pour basculer entre les graphiques.
 */
export function ChartCarousel({ slides, height = 360, className = '' }: ChartCarouselProps) {
  const [index, setIndex] = useState(0);
  const n = slides.length;
  if (!n) return null;

  const safeIndex = ((index % n) + n) % n;
  const slide = slides[safeIndex];

  const prev = useCallback(() => setIndex(i => (i - 1 + n) % n), [n]);
  const next = useCallback(() => setIndex(i => (i + 1) % n), [n]);

  return (
    <div className={`rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-[var(--shadow-card)] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium">Graphiques</p>
          <h3 className="text-sm font-semibold tracking-tight truncate">{slide.title}</h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums mr-1">
            {safeIndex + 1}/{n}
          </span>
          <button
            type="button"
            onClick={prev}
            aria-label="Graphique précédent"
            className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Graphique suivant"
            className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 px-4 pt-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={s.title}
            className={`h-1.5 rounded-full transition-all ${
              i === safeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>

      {/* Chart area */}
      <div className="px-3 pb-3 pt-2" style={{ height }}>
        <div key={slide.id} className="h-full w-full animate-fade-in">
          {slide.content}
        </div>
      </div>
    </div>
  );
}
