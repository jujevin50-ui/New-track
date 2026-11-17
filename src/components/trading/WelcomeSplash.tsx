import { useLayoutEffect, useRef } from 'react';

interface WelcomeSplashProps { name: string; showGreeting?: boolean; onDone: () => void; }

/** An odometer rolls upward from 000 to 100 before revealing the workspace. */
export function WelcomeSplash({ name, showGreeting = true, onDone }: WelcomeSplashProps) {
  const surface = useRef<HTMLDivElement>(null);
  const digits = useRef<(HTMLSpanElement | null)[]>([]);
  const progress = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  const skip = useRef(() => {});
  useLayoutEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let frame = 0, finished = false;
    const timers: number[] = [];
    const complete = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      document.body.style.overflow = oldOverflow;
      onDoneRef.current();
    };
    skip.current = complete;
    const render = (value: number) => {
      // Repeated digits keep every reel moving upward, including the 9 → 0 carry.
      const positions = [Math.max(0, value - 99), Math.floor(value / 10) + Math.max(0, value % 10 - 9), value];
      digits.current.forEach((digit, index) => { if (digit) digit.style.transform = `translate3d(0, -${positions[index]}em, 0)`; });
      if (progress.current) progress.current.style.transform = `scaleX(${value / 100})`;
    };
    const onPreference = () => { if (reduced.matches) complete(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); complete(); } };
    window.addEventListener('keydown', onKey);
    reduced.addEventListener('change', onPreference);
    render(reduced.matches ? 100 : 0);
    if (reduced.matches) timers.push(window.setTimeout(complete, 150));
    else {
      const start = performance.now();
      const animate = (now: number) => {
        if (finished) return;
        const elapsed = now - start;
        const fraction = Math.min(1, elapsed / 2200);
        render(100 * (1 - Math.pow(1 - fraction, 2)));
        if (fraction < 1) frame = requestAnimationFrame(animate);
        else timers.push(window.setTimeout(() => {
          surface.current?.classList.add('welcome-counter-exit');
          timers.push(window.setTimeout(complete, 500));
        }, 280));
      };
      frame = requestAnimationFrame(animate);
    }
    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      window.removeEventListener('keydown', onKey);
      reduced.removeEventListener('change', onPreference);
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  return <div ref={surface} className="welcome-counter" role="status" aria-label={showGreeting ? 'Ouverture de votre espace de trading' : 'Ouverture de Finance'}>
    <div className="welcome-counter-content" aria-hidden="true">
      <p className="welcome-counter-eyebrow">{showGreeting ? 'TRADING JOURNAL' : 'FINANCE'}</p>
      <div className="welcome-counter-number">
        {[2, 11, 101].map((length, index) => <span key={index} className="welcome-counter-window"><span ref={element => { digits.current[index] = element; }} className="welcome-counter-reel">{Array.from({ length }, (_, value) => <span key={value}>{value % 10}</span>)}</span></span>)}
      </div>
      <div className="welcome-counter-track"><div ref={progress} className="welcome-counter-progress" /></div>
      <p className="welcome-counter-greeting">{showGreeting ? `Bienvenue, ${name || 'Trader'}` : 'Votre espace Finance'}</p>
    </div>
    <button type="button" className="welcome-flow-skip" onClick={() => skip.current()}>Passer l’animation</button>
  </div>;
}
