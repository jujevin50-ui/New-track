import { useLayoutEffect, useRef } from 'react';

interface WelcomeSplashProps { name: string; onDone: () => void; }

/** Letters gather into a ribbon, travel to the top left, then unveil the page row by row. */
export function WelcomeSplash({ name, onDone }: WelcomeSplashProps) {
  const text = `Welcome back, ${name || 'Trader'}`;
  const canvas = useRef<HTMLCanvasElement>(null);
  const underlay = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  const skip = useRef(() => {});
  useLayoutEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useLayoutEffect(() => {
    const surface = canvas.current, backdrop = underlay.current, line = word.current;
    if (!surface || !backdrop || !line) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timers: number[] = [];
    let frame = 0, finished = false, released = false, fading = false;
    const context = surface.getContext('2d');
    const paint = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      surface.width = Math.ceil(window.innerWidth * ratio);
      surface.height = Math.ceil(window.innerHeight * ratio);
      if (context) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = getComputedStyle(document.body).backgroundColor;
        context.fillRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    paint();
    const complete = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      timers.forEach(timer => window.clearTimeout(timer));
      onDoneRef.current();
    };
    skip.current = complete;
    const fade = () => {
      if (finished || fading) return;
      fading = true;
      cancelAnimationFrame(frame);
      timers.forEach(timer => window.clearTimeout(timer));
      for (const element of [surface, backdrop, line]) {
        element.style.transition = 'opacity 300ms ease';
        element.style.opacity = '0';
      }
      timers.push(window.setTimeout(complete, 320));
    };
    const onPreference = () => { if (reduced.matches) fade(); };
    const onResize = () => { if (released) fade(); else paint(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); complete(); } };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    reduced.addEventListener('change', onPreference);

    const beginFlight = () => {
      if (finished || fading) return;
      released = true;
      backdrop.style.opacity = '0';
      if (!context) { backdrop.style.opacity = '1'; fade(); return; }
      const width = window.innerWidth, height = window.innerHeight;
      const centerX = width / 2, centerY = height / 2;
      const smooth = (value: number) => value * value * (3 - 2 * value);
      const bezier = (p: number, a: number, b: number, c: number, d: number) =>
        (1-p)**3*a + 3*(1-p)**2*p*b + 3*(1-p)*p*p*c + p**3*d;
      const rows = Math.max(3, Math.ceil(height / 210));
      const stream = (time: number) => {
        if (time < 1000) {
          const p = smooth(Math.max(0, time / 1000));
          return { x: centerX + (width * .88 - centerX) * p, y: centerY - 30 * Math.sin(p * Math.PI), reveal: false };
        }
        if (time < 2100) {
          const p = (time - 1000) / 1100;
          return { x: bezier(p, width*.88, width*1.02, width*.3, 40), y: bezier(p, centerY, height*.13, 24, 48), reveal: false };
        }
        const progress = Math.min(1, (time - 2100) / 3200);
        const sweep = progress * rows;
        const row = Math.min(rows - 1, Math.floor(sweep));
        const p = smooth(Math.min(1, sweep - row));
        return { x: row % 2 === 0 ? 40 + (width-80)*p : width-40-(width-80)*p,
          y: 48 + (height-48) * (row + p) / rows, reveal: true };
      };
      const particles = Array.from(line.querySelectorAll<HTMLElement>('[data-welcome-letter]')).map((element, index) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        element.style.animation = 'none';
        return { element, x, y, lastX: x, lastY: y, index, delay: index * 16 };
      });
      const brush = document.createElement('canvas');
      brush.width = brush.height = 128;
      const brushContext = brush.getContext('2d');
      if (brushContext) {
        const gradient = brushContext.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(0,0,0,0.9)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.55)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        brushContext.fillStyle = gradient;
        brushContext.fillRect(0, 0, 128, 128);
      }
      context.globalCompositeOperation = 'destination-out';
      const start = performance.now(), duration = 6100;
      const animate = (now: number) => {
        if (finished || fading) return;
        const elapsed = now - start;
        for (const particle of particles) {
          const time = Math.max(0, elapsed - particle.delay);
          const target = stream(time);
          const gathering = smooth(Math.min(1, time / 950));
          const ripple = Math.sin(time / 150 + particle.index * .45);
          const x = particle.x + (target.x - particle.x) * gathering;
          const y = particle.y + (target.y + ripple * 9 - particle.y) * gathering;
          const end = smooth(Math.max(0, Math.min(1, (elapsed - 5350) / 700)));
          particle.element.style.transform = `translate3d(${x - particle.x}px,${y - particle.y}px,0) rotate(${ripple * gathering * 8}deg) scale(${1 - gathering * .64})`;
          particle.element.style.opacity = String(1 - end);
          particle.element.style.filter = `blur(${gathering * .25}px)`;
          if (target.reveal) {
            const size = Math.max(100, height / rows * 1.1);
            const distance = Math.hypot(x - particle.lastX, y - particle.lastY);
            const steps = Math.min(24, Math.max(1, Math.ceil(distance / (size * .25))));
            context.globalAlpha = .28;
            for (let step = 1; step <= steps; step++) {
              const bx = particle.lastX + (x - particle.lastX) * step / steps;
              const by = particle.lastY + (y - particle.lastY) * step / steps;
              context.drawImage(brush, bx - size, by - size, size * 2, size * 2);
            }
          }
          particle.lastX = x; particle.lastY = y;
        }
        const fadeProgress = Math.max(0, Math.min(1, (elapsed - duration + 650) / 650));
        surface.style.opacity = String(1 - fadeProgress * fadeProgress * (3 - 2 * fadeProgress));
        if (elapsed >= duration) complete();
        else frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    };
    timers.push(window.setTimeout(reduced.matches ? fade : beginFlight, reduced.matches ? 450 : 1400));
    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      reduced.removeEventListener('change', onPreference);
      document.body.style.overflow = oldOverflow;
    };
  }, [text]);

  return <div className="welcome-flow" role="status" aria-label={text}>
    <div ref={underlay} className="welcome-flow-underlay" aria-hidden="true"/>
    <canvas ref={canvas} className="welcome-flow-canvas" aria-hidden="true"/>
    <div ref={word} className="welcome-flow-text" aria-hidden="true">{Array.from(text).map((letter,index) => <span key={index} data-welcome-letter className="welcome-flow-letter animate-letter-in" style={{animationDelay:`${Math.min(index * 20, 500)}ms`}}>{letter === ' ' ? '\u00A0' : letter}</span>)}</div>
    <button type="button" className="welcome-flow-skip" onClick={() => skip.current()}>Passer l’animation</button>
  </div>;
}
