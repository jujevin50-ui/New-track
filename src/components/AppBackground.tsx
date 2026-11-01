import GradientWaves from '@/components/GradientWaves';

/**
 * Fond animé type React Bits « Gradient Waves » (preset Dune)
 * fixé derrière toute l'application.
 */
export function AppBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <GradientWaves
        waveColor="#fb923c"
        amplitude={3.2}
        swell={40}
        lightAngle={60}
        speed={0.2}
        quality="medium"
        mouseInteraction
        swellOnClick={false}
        className="h-full w-full"
        style={{ width: '100%', height: '100%' }}
      />
      {/* Voile léger pour garder la lisibilité du contenu */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, hsl(var(--background) / 0.55) 0%, hsl(var(--background) / 0.72) 45%, hsl(var(--background) / 0.85) 100%)',
        }}
      />
    </div>
  );
}
