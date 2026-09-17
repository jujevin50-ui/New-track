import { useState, useEffect, useRef } from 'react';

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export function useCountUp(target: number, duration = 900, delay = 0): number {
  const [current, setCurrent] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef   = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(0 as any);

  useEffect(() => {
    setCurrent(0);
    startRef.current = null;

    const run = () => {
      const step = (ts: number) => {
        if (startRef.current === null) startRef.current = ts;
        const progress = Math.min((ts - startRef.current) / duration, 1);
        const ease = easeOutQuart(progress);
        setCurrent(ease * target);
        if (progress < 1) rafRef.current = requestAnimationFrame(step);
        else setCurrent(target);
      };
      rafRef.current = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timerRef.current = setTimeout(run, delay);
    } else {
      run();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, [target, duration, delay]);

  return current;
}
