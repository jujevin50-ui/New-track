import GradientWaves from '@/components/GradientWaves';

/**
 * Fond animé type React Bits « Gradient Waves » (preset Dune).
 * fixed + z-0 : visible sous le contenu (ne pas utiliser -z-10, sinon
 * le background de html/body le masque).
 */
export function AppBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
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
        style={{ width: '100%', height: '100%', minHeight: '100vh' }}
      />
      {/* Voile très léger uniquement pour ne pas brûler le texte */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, hsl(var(--background) / 0.25) 0%, hsl(var(--background) / 0.35) 50%, hsl(var(--background) / 0.45) 100%)',
        }}
      />
    </div>
  );
}
