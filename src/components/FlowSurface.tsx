import KineticFlowField from './KineticFlowField';
import { useWaveBackground } from '@/hooks/useWaveBackground';

export function FlowSurface({ variant = 'menu' }: { variant?: 'page' | 'menu' | 'panel' }) {
  const { config } = useWaveBackground();
  if (!config.enabled) return null;
  return <KineticFlowField color={config.waveColor} variant={variant}
    density={Math.max(0.5, Math.min(1.4, config.amplitude / 2.5))}
    speed={Math.max(0.5, Math.min(1.5, config.swell / 35))}
    intensity={variant === 'page' ? Math.max(0.12, 1 - config.veil) : Math.max(0.2, 0.85 - config.veil * 0.5)} />;
}
