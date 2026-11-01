import { Component, useMemo, type ReactNode } from 'react';
import GradientWaves from '@/components/GradientWaves';
import { useWaveBackground } from '@/hooks/useWaveBackground';

/** Catch WebGL / render errors so the rest of the app still works. */
class BgErrorBoundary extends Component<{ children: ReactNode }, { ok: boolean }> {
  state = { ok: true };
  static getDerivedStateFromError() {
    return { ok: false };
  }
  render() {
    return this.state.ok ? this.props.children : null;
  }
}

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

function WavesInner() {
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

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
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
        quality="low"
        mouseInteraction={false}
        swellOnClick={false}
        className="h-full w-full"
        style={{ width: '100%', height: '100%', minHeight: '100vh' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `hsl(var(--background) / ${Math.min(0.85, Math.max(0.45, config.veil))})`,
        }}
      />
    </div>
  );
}

/** Fond animé optionnel — désactivé par défaut (réglages → Fond animé). */
export function AppBackground() {
  const { config } = useWaveBackground();
  if (!config.enabled) return null;
  return (
    <BgErrorBoundary>
      <WavesInner />
    </BgErrorBoundary>
  );
}
