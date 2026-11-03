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
 * Widget unique avec flèches — transitions type React Bits (blur + slide).
 */
export function ChartCarousel({ slides, height = 360, className = '' }: ChartCarouselProps) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<'left' | 'right'>('right');
  const n = slides.length;
  if (!n) return null;

  const safeIndex = ((index % n) + n) % n;
  const slide = slides[safeIndex];

  const prev = useCallback(() => {
    setDir('left');
    setIndex(i => (i - 1 + n) % n);
  }, [n]);

  const next = useCallback(() => {
    setDir('right');
    setIndex(i => (i + 1) % n);
  }, [n]);

  const goTo = (i: number) => {
    setDir(i > safeIndex ? 'right' : 'left');
    setIndex(i);
  };

  return (
    <div className={`rb-border rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-[var(--shadow-card)] overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50">
        <div className="min-w-0">
          <h3
            key={slide.id + '-title'}
            className="text-sm font-semibold tracking-tight truncate animate-rb-blur-in"
          >
            {slide.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums mr-1">
            {safeIndex + 1}/{n}
          </span>
          <button
            type="button"
            onClick={prev}
            aria-label="Graphique précédent"
            className="rb-glow-hover h-8 w-8 inline-flex items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Graphique suivant"
            className="rb-glow-hover h-8 w-8 inline-flex items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 px-4 pt-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={s.title}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === safeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>

      <div className="px-3 pb-3 pt-2 overflow-hidden" style={{ height }}>
        <div
          key={slide.id}
          className={`h-full w-full ${dir === 'right' ? 'animate-rb-slide-right' : 'animate-rb-slide-left'}`}
        >
          {slide.content}
        </div>
      </div>
    </div>
  );
}
