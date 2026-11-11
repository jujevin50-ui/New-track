import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Position = { top: number; height: number };

export default function SlidingRailLinks({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const drops = useRef<HTMLSpanElement>(null);
  const previous = useRef<Position | null>(null);
  const filterId = `rail-goo-${useId().replace(/:/g, '')}`;
  const { pathname } = useLocation();
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const active = root.querySelector<HTMLElement>('.rail-link.is-current');
      const next = active ? { top: active.offsetTop, height: active.offsetHeight } : null;
      const old = previous.current;
      if (next?.top === old?.top && next?.height === old?.height) return;
      const body = pill.current;
      const cloud = drops.current;
      const rect = body?.getBoundingClientRect();
      body?.getAnimations().forEach(animation => animation.cancel());
      cloud?.replaceChildren();
      previous.current = next;
      setPosition(next);
      if (!next || !old || !body || !cloud || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const from = rect ? rect.top - root.getBoundingClientRect().top : old.top;
      const distance = next.top - from;
      body.animate([
        { transform: `translateY(${from}px) scale(1,1)`, borderRadius: '12px' },
        { transform: `translateY(${from + distance * .45}px) scale(.88,1.35)`, borderRadius: '22px', offset: .42 },
        { transform: `translateY(${next.top}px) scale(1.025,.96)`, borderRadius: '14px', offset: .8 },
        { transform: `translateY(${next.top}px) scale(1,1)`, borderRadius: '12px' },
      ], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
      for (let index = 0; index < 15; index++) {
        const drop = document.createElement('span');
        drop.className = 'rail-gooey-drop';
        const radius = 8 + Math.random() * 10;
        const x = root.clientWidth * (.18 + Math.random() * .64);
        const spread = (Math.random() - .5) * 44;
        drop.style.width = drop.style.height = `${radius * 2}px`;
        drop.style.left = `${x - radius}px`;
        drop.style.top = '0';
        cloud.append(drop);
        const animation = drop.animate([
          { transform: `translate(0,${from + old.height / 2 - radius}px) scale(.65)` },
          { transform: `translate(${spread}px,${from + distance * .55 + next.height / 2 - radius}px) scale(1)`, offset: .45 },
          { transform: `translate(0,${next.top + next.height / 2 - radius}px) scale(.2)` },
        ], { duration: 600 + Math.random() * 220, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
        animation.onfinish = () => drop.remove();
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [pathname, children]);

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (!media.matches) return;
      pill.current?.getAnimations().forEach(animation => animation.cancel());
      drops.current?.replaceChildren();
    };
    media.addEventListener('change', stop);
    return () => media.removeEventListener('change', stop);
  }, []);

  return <div ref={ref} className="rail-links rail-links-sliding rail-links-gooey">
    <svg className="rail-gooey-defs" aria-hidden="true"><defs><filter id={filterId} x="-30%" y="-20%" width="160%" height="140%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" /></filter></defs></svg>
    <span className="rail-gooey-layer" aria-hidden="true" style={{ filter: `url(#${filterId})` }}>
      <span ref={pill} className="rail-gooey-pill" style={{ visibility: position ? 'visible' : 'hidden', height: position?.height ?? 0, transform: `translateY(${position?.top ?? 0}px)` }} />
      <span ref={drops} />
    </span>
    {position && <span aria-hidden="true" className="rail-selection-slider" style={{height: position.height, transform: `translateY(${position.top}px)`}}><i /><i /></span>}
    {children}
  </div>;
}
