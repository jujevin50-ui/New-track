import { useEffect, useState } from 'react';

interface WelcomeSplashProps {
  name: string;
  onDone: () => void;
}

/**
 * Full-screen "Welcome back" splash shown once, right when the app launches.
 * Self-dismisses after a short beat and tells the parent to unmount it.
 */
export function WelcomeSplash({ name, onDone }: WelcomeSplashProps) {
  const [fading, setFading] = useState(false);
  const text = `Welcome back, ${name || 'Trader'}`;
  const letters = text.split('');
  const staggerMs = 35;
  const revealDuration = letters.length * staggerMs + 400; // last letter's delay + its own animation

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), Math.max(revealDuration + 900, 2600));
    const doneTimer = setTimeout(onDone, Math.max(revealDuration + 900, 2600) + 400);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-500 ease-out ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="px-6 flex justify-center flex-wrap">
        {letters.map((ch, i) => (
          <span
            key={i}
            className="inline-block animate-letter-in text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent"
            style={{ animationDelay: `${i * staggerMs}ms` }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        ))}
      </div>
    </div>
  );
}
