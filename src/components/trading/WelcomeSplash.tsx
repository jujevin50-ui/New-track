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
    const fadeTimer = setTimeout(() => setFading(true), 2600);
    const doneTimer = setTimeout(onDone, 3000);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-500 ease-out ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="animate-welcome-slide px-6">
        <span className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight whitespace-nowrap bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
          Welcome Back {name || 'Trader'}
        </span>
      </div>
    </div>
  );
}
