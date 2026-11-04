import { FlowSurface } from '@/components/FlowSurface';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** A single selection surface slides between links without shifting the layout. */
export function HeaderNavLinks({ activeKey, children }: { activeKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const updateEdges = () => {
      container.dataset.overflowStart = String(container.scrollLeft > 1);
      container.dataset.overflowEnd = String(container.scrollLeft + container.clientWidth < container.scrollWidth - 1);
    };
    const update = () => {
      updateEdges();
      const active = container.querySelector<HTMLElement>('[aria-current="page"]');
      const next = active ? { x: active.offsetLeft, width: active.offsetWidth } : { x: 0, width: 0 };
      setIndicator(previous => previous.x === next.x && previous.width === next.width ? previous : next);
    };
    const reveal = () => {
      const active = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return;
      const left = active.offsetLeft - 4;
      const right = active.offsetLeft + active.offsetWidth + 4;
      const target = left < container.scrollLeft ? left : right > container.scrollLeft + container.clientWidth ? right - container.clientWidth : container.scrollLeft;
      container.scrollTo({ left: target, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    update(); reveal();
    container.addEventListener('scroll', updateEdges, { passive: true });
    const observer = new ResizeObserver(() => { update(); reveal(); });
    observer.observe(container);
    container.querySelectorAll('a, button').forEach(element => observer.observe(element));
    let mounted = true;
    document.fonts?.ready.then(() => { if (mounted) { update(); reveal(); } });
    return () => { mounted = false; observer.disconnect(); container.removeEventListener('scroll', updateEdges); };
  }, [activeKey, children]);

  return (
    <div className="header-nav-surface">
      <FlowSurface />
    <div ref={ref} className="header-nav-links no-scrollbar">
      <span aria-hidden="true" className="header-nav-indicator" style={{ width: indicator.width, opacity: indicator.width ? 1 : 0, transform: `translate3d(${indicator.x}px,0,0)` }} />
      {children}
    </div>
    </div>
  );
}
