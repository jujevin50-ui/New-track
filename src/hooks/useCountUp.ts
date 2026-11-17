import { useState, useEffect } from 'react';

export function useCountUp(target: number, duration = 900, delay = 0, enabled = true): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const finish = () => { stopped = true; cancelAnimationFrame(frame); clearTimeout(timer); setCurrent(target); };
    const preference = () => { if (media.matches) finish(); };
    media.addEventListener('change', preference);
    if (media.matches || !Number.isFinite(target) || duration <= 0) setCurrent(target);
    else {
      setCurrent(0);
      if (enabled) {
        const run = () => {
          let start: number | undefined;
          const step = (now: number) => {
            if (stopped) return;
            start ??= now;
            const progress = Math.min((now - start) / duration, 1);
            setCurrent(progress === 1 ? target : (1 - Math.pow(1 - progress, 3)) * target);
            if (progress < 1) frame = requestAnimationFrame(step);
          };
          frame = requestAnimationFrame(step);
        };
        if (delay > 0) timer = setTimeout(run, delay); else run();
      }
    }
    return () => { stopped = true; cancelAnimationFrame(frame); clearTimeout(timer); media.removeEventListener('change', preference); };
  }, [target, duration, delay, enabled]);
  return current;
}
