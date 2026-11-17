import { useLayoutEffect, useRef } from 'react';

interface WelcomeSplashProps { name: string; showGreeting?: boolean; onDone: () => void; }

/** Motivational phrases scroll upward before the workspace is revealed. */
export function WelcomeSplash({ name, showGreeting = true, onDone }: WelcomeSplashProps) {
  const surface = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
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
      const position = Math.min(3, Math.floor(value / 25));
      if (words.current) words.current.style.transform = `translateY(-${position * 25}%)`;
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
        const fraction = Math.min(1, elapsed / 2400);
        render(100 * fraction);
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
      <div className="welcome-words-window"><div ref={words} className="welcome-words-reel">{['Stay disciplined.', 'Hard work.', 'Trust the process.', 'Stay consistent.'].map(phrase => <div key={phrase} className="welcome-words-phrase">{phrase}</div>)}</div></div>
      <div className="welcome-counter-track"><div ref={progress} className="welcome-counter-progress" /></div>
      <p className="welcome-counter-greeting">{showGreeting ? `Bienvenue, ${name || 'Trader'}` : 'Votre espace Finance'}</p>
    </div>
    <button type="button" className="welcome-flow-skip" onClick={() => skip.current()}>Passer l’animation</button>
  </div>;
}
