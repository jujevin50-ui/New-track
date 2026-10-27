import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'trading-journal-theme';
/** v3 : thème gris design par défaut ; le choix sombre reste mémorisé ensuite. */
const MODE_KEY = 'trading-journal-mode-v2';

export type ThemeMode = 'dark' | 'light';

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

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement;
  const hsl = `${config.primaryHue} ${config.primarySat}% ${config.primaryLight}%`;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--balance', hsl);
  root.style.setProperty('--chart-balance', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-ring', hsl);
  root.style.setProperty('--shadow-glow-primary', `0 0 20px hsl(${hsl} / 0.15)`);
}

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.remove('light');
  }
}

/** Applique le thème (couleur + mode) dès le démarrage de l'app, sur TOUTES les pages.
 *  Gris design par défaut ; le mode sombre reste disponible dans les réglages. */
export function initTheme() {
  applyTheme(readTheme());
  let mode: ThemeMode = 'light';
  try { if (localStorage.getItem(MODE_KEY) === 'dark') mode = 'dark'; } catch { /* clair */ }
  applyMode(mode);
}

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeConfig>(readTheme);

  const [mode, setModeState] = useState<ThemeMode>(() => {
    try { return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    applyMode(mode);
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const setColor = useCallback((hue: number, sat: number, light: number) => {
    setTheme({ primaryHue: hue, primarySat: sat, primaryLight: light });
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, mode, setColor, toggleMode, presets: COLOR_PRESETS };
};
