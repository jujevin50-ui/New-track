import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'trading-journal-theme';
const MODE_KEY = 'trading-journal-mode';

export type ThemeMode = 'dark' | 'light';

export interface ThemeConfig {
  primaryHue: number;
  primarySat: number;
  primaryLight: number;
}

const DEFAULT_THEME: ThemeConfig = { primaryHue: 246, primarySat: 90, primaryLight: 63 };

const COLOR_PRESETS = [
  { name: 'Blanc', hue: 0, sat: 0, light: 95 },
  { name: 'Gris', hue: 0, sat: 0, light: 60 },
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

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_THEME;
    } catch { return DEFAULT_THEME; }
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem(MODE_KEY) as ThemeMode) || 'dark';
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
