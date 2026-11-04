import { useEffect, useState } from 'react';
import AeroShards from './AeroShards';
import { useWaveBackground } from '@/hooks/useWaveBackground';

/** Finance uses the same saved palette and visibility controls as Trading. */
export default function FinanceBackground() {
  const { config } = useWaveBackground();
  const [unavailable, setUnavailable] = useState(false);
  const [lightMode, setLightMode] = useState(() => !document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => setLightMode(!document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-hidden="true" data-background="aero-shards" data-color={config.waveColor} className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 25% 30%, ${config.waveColor}30, transparent 65%)` }} />
      {!unavailable && <AeroShards
        shardColor={config.waveColor}
        accentColor={config.waveColor}
        lightMode={lightMode}
        count={Math.round(Math.min(1300, Math.max(400, config.amplitude * 300)))}
        speed={Math.min(1.2, Math.max(0.2, config.swell / 60))}
        dpr={1.25}
        markers="none"
        mouseInteraction={false}
        pulseOnClick={false}
        holdToGather={false}
        grain={0.025}
        glow={0.25}
        intro={false}
        onError={() => setUnavailable(true)}
      />}
      <div className="absolute inset-0" style={{ background: `hsl(var(--background) / ${Math.min(0.78, Math.max(0.35, config.veil))})` }} />
    </div>
  );
}
