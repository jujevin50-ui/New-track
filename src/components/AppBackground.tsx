import GradientWaves from '@/components/GradientWaves';
import { useWaveBackground } from '@/hooks/useWaveBackground';

/**
 * Fond animé React Bits « Gradient Waves ».
 * Couleurs / intensité pilotés par useWaveBackground (réglages).
 * Voile unique et équilibré pour trading + invest.
 */
export function AppBackground() {
  const { config } = useWaveBackground();

  if (!config.enabled) return null;

  const veil = config.veil;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <GradientWaves
        waveColor={config.waveColor}
        amplitude={config.amplitude}
        swell={config.swell}
        lightAngle={60}
        speed={0.2}
        quality="medium"
        mouseInteraction
        swellOnClick={false}
        className="h-full w-full"
        style={{ width: '100%', height: '100%', minHeight: '100vh' }}
      />
      {/* Voile uniforme — même opacité partout pour une lecture stable */}
      <div
        className="absolute inset-0"
        style={{
          background: `hsl(var(--background) / ${veil})`,
        }}
      />
    </div>
  );
}
