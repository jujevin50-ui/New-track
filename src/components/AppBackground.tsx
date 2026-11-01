import GradientWaves from '@/components/GradientWaves';
import { useWaveBackground } from '@/hooks/useWaveBackground';
import { useMemo } from 'react';

/** Assombrit une couleur hex pour le fond distant des vagues */
function darkenHex(hex: string, amount = 0.82): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#0a0a0a';
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function mixHex(hex: string, withBlack = 0.55): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#111111';
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - withBlack));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - withBlack));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - withBlack));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Fond animé : la couleur choisie teinte TOUT le fond (horizon + vagues + voile teinté).
 */
export function AppBackground() {
  const { config } = useWaveBackground();

  const colors = useMemo(() => {
    const wave = config.waveColor || '#fb923c';
    return {
      wave,
      horizon: mixHex(wave, 0.35),
      background: darkenHex(wave, 0.88),
      crest: mixHex(wave, 0.15),
    };
  }, [config.waveColor]);

  if (!config.enabled) return null;

  // Voile teinté de la couleur (pas seulement du background gris/noir)
  const veil = config.veil;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: colors.background }}
    >
      <GradientWaves
        waveColor={colors.wave}
        horizonColor={colors.horizon}
        backgroundColor={colors.background}
        crestColor={colors.crest}
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
      {/* Voile teinté : laisse bien voir la couleur choisie */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${colors.background} 0%, transparent 40%, ${colors.background} 100%)`,
          opacity: Math.min(0.75, Math.max(0.15, veil * 0.7)),
        }}
      />
    </div>
  );
}
