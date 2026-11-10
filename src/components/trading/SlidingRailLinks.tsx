import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export default function SlidingRailLinks({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const [position, setPosition] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const active = root.querySelector<HTMLElement>('.rail-link.is-current');
      setPosition(active ? { top: active.offsetTop, height: active.offsetHeight } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [pathname, children]);
  return <div ref={ref} className="rail-links rail-links-sliding">
    {position && <span aria-hidden="true" className="rail-selection-slider" style={{height: position.height, transform: `translateY(${position.top}px)`}}><i /><i /></span>}
    {children}
  </div>;
}
