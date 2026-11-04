import { useSyncExternalStore, useEffect, useCallback } from 'react';

const KEY = 'trading-journal-wave-bg-v4';

export interface WaveBgConfig {
  /** Couleur principale du flux (hex) */
  waveColor: string;
  /** Opacité du voile (0 = flux très visible, 1 = quasi opaque) */
  veil: number;
  /** Densité du flux */
  amplitude: number;
  /** Énergie du flux */
  swell: number;
  /** Activer / désactiver le fond animé */
  enabled: boolean;
}

export const WAVE_PRESETS: { name: string; waveColor: string; amplitude: number; swell: number }[] = [
  { name: 'Dune', waveColor: '#fb923c', amplitude: 3.2, swell: 40 },
  { name: 'Ocean', waveColor: '#38bdf8', amplitude: 1.8, swell: 25 },
  { name: 'Dusk', waveColor: '#c084fc', amplitude: 2.5, swell: 35 },
  { name: 'Silk', waveColor: '#e2e8f0', amplitude: 2.2, swell: 30 },
  { name: 'Aurora', waveColor: '#34d399', amplitude: 2.6, swell: 38 },
  { name: 'Midnight', waveColor: '#6366f1', amplitude: 2.8, swell: 36 },
  { name: 'Ember', waveColor: '#f43f5e', amplitude: 3.0, swell: 42 },
  { name: 'Forest', waveColor: '#22c55e', amplitude: 2.0, swell: 28 },
];

/** Voile équilibré : lisible sur Trading et Finance */
const DEFAULT: WaveBgConfig = {
  waveColor: '#fb923c',
  veil: 0.58,
  amplitude: 3.2,
  swell: 40,
  enabled: true,
};

const CHANGE_EVENT = 'trading-background-change';
let cachedRaw: string | null | undefined;
let cachedConfig: WaveBgConfig = DEFAULT;

function snapshot(): WaveBgConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try { cachedConfig = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT; }
      catch { cachedConfig = DEFAULT; }
    }
  } catch { /* Keep the in-memory preference when storage is unavailable. */ }
  return cachedConfig;
}

function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => { if (!event.key || event.key === KEY) listener(); };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(CHANGE_EVENT, listener); window.removeEventListener('storage', storage); };
}

function setConfig(update: (config: WaveBgConfig) => WaveBgConfig) {
  const next = update(snapshot());
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    cachedConfig = next;
  } catch { return; }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useWaveBackground() {
  const config = useSyncExternalStore(subscribe, snapshot, () => DEFAULT);
  useEffect(() => {
    document.documentElement.style.setProperty('--wave-veil', String(config.veil));
    document.documentElement.style.setProperty('--wave-color', config.waveColor);
  }, [config]);

  const setWaveColor = useCallback((waveColor: string) => {
    setConfig(c => ({ ...c, waveColor }));
  }, []);

  const setVeil = useCallback((veil: number) => {
    setConfig(c => ({ ...c, veil: Math.min(0.85, Math.max(0.1, veil)) }));
  }, []);

  const setAmplitude = useCallback((amplitude: number) => {
    setConfig(c => ({ ...c, amplitude }));
  }, []);

  const setSwell = useCallback((swell: number) => {
    setConfig(c => ({ ...c, swell }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setConfig(c => ({ ...c, enabled }));
  }, []);

  const applyPreset = useCallback((name: string) => {
    const p = WAVE_PRESETS.find(x => x.name === name);
    if (!p) return;
    setConfig(c => ({
      ...c,
      waveColor: p.waveColor,
      amplitude: p.amplitude,
      swell: p.swell,
      enabled: true,
    }));
  }, []);

  return {
    config,
    presets: WAVE_PRESETS,
    setWaveColor,
    setVeil,
    setAmplitude,
    setSwell,
    setEnabled,
    applyPreset,
  };
}
