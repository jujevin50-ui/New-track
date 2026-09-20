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

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1300);
    const doneTimer = setTimeout(onDone, 1700);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-500 ease-out ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center gap-3 animate-fade-in-up">
        <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
          Welcome Back
        </span>
        <span className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
          {name || 'Trader'}
        </span>
        <span className="h-1 w-12 rounded-full bg-primary/60 mt-1" />
      </div>
    </div>
  );
}
