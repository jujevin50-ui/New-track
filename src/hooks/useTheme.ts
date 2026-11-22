import { foregroundForHsl } from '@/lib/colorContrast';
import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'trading-journal-theme';
const MODE_KEY = 'trading-journal-mode-v2';

export type ThemeMode = 'light' | 'gray' | 'dark';

export interface ThemeConfig {
  primaryHue: number;
  primarySat: number;
  primaryLight: number;
}

/** Gris design : accent neutre élégant (slate) */
const DEFAULT_THEME: ThemeConfig = { primaryHue: 220, primarySat: 9, primaryLight: 46 };
/** Ancien accent par défaut : s'il est encore enregistré, on passe au gris. */
const isOldDefault = (c: ThemeConfig) =>
  (c.primaryHue === 246 && c.primarySat === 90 && c.primaryLight === 63) ||
  (c.primaryHue === 244 && c.primarySat === 76 && c.primaryLight === 58);
const readTheme = (): ThemeConfig => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    const parsed = saved ? (JSON.parse(saved) as ThemeConfig) : DEFAULT_THEME;
    return isOldDefault(parsed) ? DEFAULT_THEME : parsed;
  } catch { return DEFAULT_THEME; }
};

const COLOR_PRESETS = [
  { name: 'Gris', hue: 220, sat: 9, light: 46 },
  { name: 'Slate', hue: 215, sat: 16, light: 47 },
  { name: 'Charcoal', hue: 0, sat: 0, light: 32 },
  { name: 'Blanc', hue: 0, sat: 0, light: 95 },
  { name: 'Violet', hue: 270, sat: 70, light: 55 },
  { name: 'Bleu', hue: 220, sat: 80, light: 55 },
  { name: 'Cyan', hue: 190, sat: 80, light: 50 },
  { name: 'Teal', hue: 170, sat: 70, light: 45 },
  { name: 'Vert', hue: 150, sat: 65, light: 45 },
  { name: 'Lime', hue: 85, sat: 65, light: 50 },
  { name: 'Jaune', hue: 45, sat: 90, light: 50 },
  { name: 'Orange', hue: 25, sat: 90, light: 53 },
  { name: 'Rouge', hue: 0, sat: 72, light: 51 },
  { name: 'Rose', hue: 340, sat: 75, light: 55 },
  { name: 'Fuchsia', hue: 300, sat: 70, light: 55 },
  { name: 'Indigo', hue: 245, sat: 70, light: 55 },
];

function applyTheme(config: ThemeConfig, mode: ThemeMode) {
  const root = document.documentElement;
  const vivid = mode === 'gray';
  const hue = vivid && config.primarySat < 25 ? 215 : config.primaryHue;
  const saturation = vivid ? Math.max(config.primarySat, 88) : config.primarySat;
  const lightness = vivid ? 72 : config.primaryLight;
  const hsl = `${hue} ${saturation}% ${lightness}%`;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--primary-foreground', foregroundForHsl(hue, saturation, lightness));
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--balance', hsl);
  root.style.setProperty('--chart-balance', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-ring', hsl);
  root.style.setProperty('--shadow-glow-primary', `0 0 20px hsl(${hsl} / 0.15)`);
}

function readMode(): ThemeMode {
  try {
    const value = localStorage.getItem(MODE_KEY);
    if (value === 'gray' || value === 'dark') return value;
  } catch { /* clair */ }
  return 'light';
}

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode !== 'light');
  root.classList.toggle('theme-gray', mode === 'gray');
  root.classList.remove('light');
}

/** Applique la couleur système et le mode avant le premier rendu React. */
export function initTheme() {
  const mode = readMode();
  applyTheme(readTheme(), mode);
  applyMode(mode);
}

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeConfig>(readTheme);

  const [mode, setMode] = useState<ThemeMode>(readMode);

  useEffect(() => {
    applyTheme(theme, mode);
    applyMode(mode);
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    localStorage.setItem(MODE_KEY, mode);
  }, [theme, mode]);

  const setColor = useCallback((hue: number, sat: number, light: number) => {
    setTheme({ primaryHue: hue, primarySat: sat, primaryLight: light });
  }, []);

  return { theme, mode, setColor, setMode, presets: COLOR_PRESETS };
};
