import { useState, useCallback, useEffect } from 'react';

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

export interface WidgetConfig {
  id: string;
  visible: boolean;
  color: string;
  medianVisible?: boolean;
}

export const STAT_DEFS = [
  { id: 'stat-balance', label: 'Balance', key: 'currentBalance' },
  { id: 'stat-total-profit', label: 'Total Profit', key: 'totalProfit' },
  { id: 'stat-profit-percent', label: 'Profit %', key: 'profitPercent' },
  { id: 'stat-total-trades', label: 'Total Trades', key: 'totalTrades' },
  { id: 'stat-win-rate', label: 'Win Rate', key: 'winRate' },
  { id: 'stat-profit-factor', label: 'Profit Factor', key: 'profitFactor' },
  { id: 'stat-avg-trade', label: 'Avg Trade', key: 'avgTrade' },
  { id: 'stat-max-drawdown', label: 'Max Drawdown', key: 'maxDrawdown' },
  { id: 'stat-best-trade', label: 'Best Trade', key: 'bestTrade' },
  { id: 'stat-worst-trade', label: 'Worst Trade', key: 'worstTrade' },
  { id: 'stat-expectancy', label: 'Expectancy', key: 'expectancy' },
  { id: 'stat-wins', label: 'Winners', key: 'wins' },
  { id: 'stat-losses', label: 'Losers', key: 'losses' },
  { id: 'stat-avg-rr', label: 'Avg RR', key: 'avgRR' },
  { id: 'stat-longest-win', label: 'Win Streak', key: 'longestWinStreak' },
  { id: 'stat-longest-loss', label: 'Loss Streak', key: 'longestLossStreak' },
  { id: 'stat-avg-win', label: 'Avg Win', key: 'avgWin' },
  { id: 'stat-avg-loss', label: 'Avg Loss', key: 'avgLoss' },
];

export const WIDGET_DEFS = [
  // Individual stat widgets
  { id: 'stat-balance',         title: 'Balance' },
  { id: 'stat-total-profit',    title: 'Total Profit' },
  { id: 'stat-profit-percent',  title: 'Profit %' },
  { id: 'stat-total-trades',    title: 'Total Trades' },
  { id: 'stat-win-rate',        title: 'Win Rate' },
  { id: 'stat-profit-factor',   title: 'Profit Factor' },
  { id: 'stat-avg-trade',       title: 'Avg Trade' },
  { id: 'stat-max-drawdown',    title: 'Max Drawdown' },
  { id: 'stat-best-trade',      title: 'Best Trade' },
  { id: 'stat-worst-trade',     title: 'Worst Trade' },
  { id: 'stat-expectancy',      title: 'Expectancy' },
  { id: 'stat-wins',            title: 'Winners' },
  { id: 'stat-losses',          title: 'Losers' },
  { id: 'stat-avg-rr',          title: 'Avg RR' },
  { id: 'stat-longest-win',     title: 'Win Streak' },
  { id: 'stat-longest-loss',    title: 'Loss Streak' },
  { id: 'stat-avg-win',         title: 'Avg Win' },
  { id: 'stat-avg-loss',        title: 'Avg Loss' },
  // Chart widgets
  { id: 'equity-curve',         title: 'Equity Curve (Account)' },
  { id: 'equity-percent',       title: 'Performance % (Account)' },
  { id: 'global-equity',        title: 'Global Equity Curve' },
  { id: 'global-percent',       title: 'Global Performance %' },
  { id: 'profit-per-trade',     title: 'Profit per Trade' },
  { id: 'drawdown',             title: 'Drawdown' },
  { id: 'pair-performance',     title: 'Pair Performance' },
  { id: 'account-performance',  title: 'Account Performance (%)' },
  { id: 'quality-performance',  title: 'Setup Quality' },
  { id: 'strategy-performance', title: 'Strategy Adherence' },
  { id: 'exit-distribution',    title: 'Exit Distribution' },
  { id: 'profit-by-day',        title: 'Profit by Day' },
  { id: 'profit-by-month',      title: 'Profit by Month' },
  { id: 'profit-distribution',  title: 'Profit Distribution' },
  { id: 'win-loss-streak',      title: 'Win/Loss Streaks' },
  { id: 'cumulative-rr',        title: 'Cumulative RR' },
  { id: 'monthly-returns',      title: 'Monthly Returns (Heatmap)' },
  { id: 'trade-duration',       title: 'Trade Duration' },
  { id: 'post-its',             title: 'Post-its' },
  { id: 'htf-bias',             title: 'Biais HTF' },
  { id: 'pending-orders-list',  title: 'Ordres en attente' },
  { id: 'daily-journal',        title: 'Journal du jour' },
  { id: 'account-balances',     title: 'Balances comptes (récents)' },
];

export const PRESET_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Blue', value: 'hsl(210, 80%, 55%)' },
  { name: 'Light Blue', value: 'hsl(200, 85%, 60%)' },
  { name: 'Indigo', value: 'hsl(245, 75%, 55%)' },
  { name: 'Green', value: 'hsl(142, 71%, 45%)' },
  { name: 'Emerald', value: 'hsl(160, 84%, 39%)' },
  { name: 'Mint', value: 'hsl(170, 70%, 50%)' },
  { name: 'Red', value: 'hsl(0, 84%, 60%)' },
  { name: 'Orange', value: 'hsl(25, 95%, 53%)' },
  { name: 'Amber', value: 'hsl(38, 92%, 50%)' },
  { name: 'Coral', value: 'hsl(16, 85%, 60%)' },
  { name: 'Purple', value: 'hsl(270, 70%, 55%)' },
  { name: 'Lavender', value: 'hsl(280, 60%, 65%)' },
  { name: 'Pink', value: 'hsl(330, 80%, 55%)' },
  { name: 'Fuchsia', value: 'hsl(300, 70%, 50%)' },
  { name: 'Cyan', value: 'hsl(185, 80%, 45%)' },
  { name: 'Teal', value: 'hsl(175, 75%, 40%)' },
  { name: 'Yellow', value: 'hsl(50, 90%, 50%)' },
  { name: 'Lime', value: 'hsl(82, 78%, 55%)' },
  { name: 'White', value: 'hsl(0, 0%, 95%)' },
  { name: 'Gray', value: 'hsl(220, 15%, 60%)' },
  { name: 'Noir', value: 'hsl(0, 0%, 10%)' },
];

// Sizes in a 10-column grid (rowHeight = 130px)
const WIDGET_SIZES: Record<string, { w: number; h: number }> = {
  // Stat cards: compact (w:2 = 20% width, h:1 = 130px)
  'stat-balance':         { w: 2, h: 1 },
  'stat-total-profit':    { w: 2, h: 1 },
  'stat-profit-percent':  { w: 2, h: 1 },
  'stat-total-trades':    { w: 2, h: 1 },
  'stat-win-rate':        { w: 2, h: 1 },
  'stat-profit-factor':   { w: 2, h: 1 },
  'stat-avg-trade':       { w: 2, h: 1 },
  'stat-max-drawdown':    { w: 2, h: 1 },
  'stat-best-trade':      { w: 2, h: 1 },
  'stat-worst-trade':     { w: 2, h: 1 },
  'stat-expectancy':      { w: 2, h: 1 },
  'stat-wins':            { w: 2, h: 1 },
  'stat-losses':          { w: 2, h: 1 },
  'stat-avg-rr':          { w: 2, h: 1 },
  'stat-longest-win':     { w: 2, h: 1 },
  'stat-longest-loss':    { w: 2, h: 1 },
  'stat-avg-win':         { w: 2, h: 1 },
  'stat-avg-loss':        { w: 2, h: 1 },
  // Charts
  'equity-curve':         { w: 5, h: 2 },
  'equity-percent':       { w: 5, h: 2 },
  'global-equity':        { w: 5, h: 2 },
  'global-percent':       { w: 5, h: 2 },
  'profit-per-trade':     { w: 10, h: 2 },
  'drawdown':             { w: 5, h: 2 },
  'pair-performance':     { w: 4, h: 2 },
  'account-performance':  { w: 6, h: 2 },
  'quality-performance':  { w: 4, h: 2 },
  'strategy-performance': { w: 3, h: 2 },
  'exit-distribution':    { w: 3, h: 2 },
  'profit-by-day':        { w: 5, h: 2 },
  'profit-by-month':      { w: 5, h: 2 },
  'profit-distribution':  { w: 5, h: 2 },
  'win-loss-streak':      { w: 5, h: 2 },
  'cumulative-rr':        { w: 5, h: 2 },
  'monthly-returns':      { w: 10, h: 2 },
  'trade-duration':       { w: 5, h: 2 },
  'post-its':             { w: 3, h: 3 },
  'htf-bias':             { w: 3, h: 3 },
  'pending-orders-list':  { w: 4, h: 3 },
  'daily-journal':        { w: 4, h: 3 },
  'account-balances':     { w: 3, h: 3 },
};

const GRID_COLS = 10;
const buildDefaultLayout = (): LayoutItem[] => {
  const items: LayoutItem[] = [];
  let x = 0, y = 0, rowMaxH = 0;
  WIDGET_DEFS.forEach(w => {
    const size = WIDGET_SIZES[w.id] || { w: 2, h: 2 };
    if (x + size.w > GRID_COLS) { x = 0; y += rowMaxH; rowMaxH = 0; }
    items.push({ i: w.id, x, y, w: size.w, h: size.h, minW: 1, minH: 1 });
    rowMaxH = Math.max(rowMaxH, size.h);
    x += size.w;
    if (x >= GRID_COLS) { x = 0; y += rowMaxH; rowMaxH = 0; }
  });
  return items;
};

const sanitizeLayout = (items: LayoutItem[]): LayoutItem[] =>
  items.map(({ maxW, maxH, ...item }) => ({
    ...item,
    minW: Math.max(1, item.minW ?? 1),
    minH: Math.max(1, item.minH ?? 1),
  }));

const DEFAULT_LAYOUT: LayoutItem[] = sanitizeLayout(buildDefaultLayout());

const HIDDEN_BY_DEFAULT = [
  'stat-avg-rr', 'stat-longest-win', 'stat-longest-loss', 'stat-avg-win', 'stat-avg-loss',
  'profit-distribution', 'win-loss-streak', 'cumulative-rr', 'monthly-returns', 'trade-duration',
  'htf-bias', 'pending-orders-list', 'daily-journal', 'account-balances',
];
const DEFAULT_CONFIGS: WidgetConfig[] = WIDGET_DEFS.map(w => ({
  id: w.id,
  visible: !HIDDEN_BY_DEFAULT.includes(w.id),
  color: '',
}));


// Default configs for the "Analyse" view: only the new widgets + profit-per-trade visible
const ANALYSE_VISIBLE = ['htf-bias', 'pending-orders-list', 'daily-journal', 'account-balances', 'profit-per-trade'];
const ANALYSE_DEFAULT_CONFIGS: WidgetConfig[] = WIDGET_DEFS.map(w => ({
  id: w.id,
  visible: ANALYSE_VISIBLE.includes(w.id),
  color: '',
}));
const ANALYSE_DEFAULT_LAYOUT: LayoutItem[] = sanitizeLayout([
  { i: 'htf-bias',            x: 0, y: 0, w: 1, h: 2 },
  { i: 'pending-orders-list', x: 1, y: 0, w: 1, h: 2 },
  { i: 'account-balances',    x: 2, y: 0, w: 1, h: 2 },
  { i: 'daily-journal',       x: 0, y: 2, w: 1, h: 2 },
  { i: 'profit-per-trade',    x: 1, y: 2, w: 2, h: 2 },
]);

const DEFAULT_STAT_CONFIGS: WidgetConfig[] = STAT_DEFS.map(s => ({
  id: s.id,
  visible: !['stat-avg-rr', 'stat-longest-win', 'stat-longest-loss', 'stat-avg-win', 'stat-avg-loss'].includes(s.id),
  color: '',
}));

const baseKey = (key: string, viewId: string) => viewId === 'main' ? key : `${key}:${viewId}`;
const CONFIG_KEY = 'dashboard-widget-configs';
const LAYOUT_KEY = 'dashboard-widget-layout';
const LAYOUT_VERSION_KEY = 'dashboard-layout-version';
const CONFIG_VERSION_KEY = 'dashboard-config-version';
const LAYOUT_VERSION = 6;
const CONFIG_VERSION = 3;
const STAT_CONFIG_KEY = 'dashboard-stat-configs';
const MEDIAN_LINE_KEY = 'dashboard-median-line';
const DEFAULT_MEDIAN_LINE = { color: 'hsl(38,92%,50%)', visible: true };

export const useDashboardConfig = (viewId: string = 'main') => {
  const isMain = viewId === 'main';
  const defaultConfigs = isMain ? DEFAULT_CONFIGS : ANALYSE_DEFAULT_CONFIGS;
  const defaultLayout = isMain ? DEFAULT_LAYOUT : ANALYSE_DEFAULT_LAYOUT;

  const [configs, setConfigs] = useState<WidgetConfig[]>(() => {
    try {
      const configVersionKey = baseKey(CONFIG_VERSION_KEY, viewId);
      const storedConfigVersion = localStorage.getItem(configVersionKey);
      if (!storedConfigVersion || Number(storedConfigVersion) < CONFIG_VERSION) {
        localStorage.setItem(configVersionKey, String(CONFIG_VERSION));
        return defaultConfigs;
      }
      const stored = localStorage.getItem(baseKey(CONFIG_KEY, viewId));
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetConfig[];
        const ids = new Set(parsed.map(c => c.id));
        const merged = [...parsed];
        WIDGET_DEFS.forEach(w => {
          if (!ids.has(w.id)) {
            const def = defaultConfigs.find(c => c.id === w.id);
            merged.push({ id: w.id, visible: def?.visible ?? false, color: '' });
          }
        });
        return merged;
      }
    } catch {}
    return defaultConfigs;
  });

  const [statConfigs, setStatConfigs] = useState<WidgetConfig[]>(() => {
    try {
      const stored = localStorage.getItem(STAT_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetConfig[];
        const ids = new Set(parsed.map(c => c.id));
        const merged = [...parsed];
        STAT_DEFS.forEach(s => {
          if (!ids.has(s.id)) merged.push({ id: s.id, visible: false, color: '' });
        });
        return merged;
      }
    } catch {}
    return DEFAULT_STAT_CONFIGS;
  });

  const [medianLine, setMedianLineState] = useState<{ color: string; visible: boolean }>(() => {
    try {
      const stored = localStorage.getItem(MEDIAN_LINE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_MEDIAN_LINE;
  });

  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try {
      const versionKey = baseKey(LAYOUT_VERSION_KEY, viewId);
      const layoutKey = baseKey(LAYOUT_KEY, viewId);
      const storedVersion = localStorage.getItem(versionKey);
      if (storedVersion && Number(storedVersion) >= LAYOUT_VERSION) {
        const stored = localStorage.getItem(layoutKey);
        if (stored) return sanitizeLayout(JSON.parse(stored) as LayoutItem[]);
      }
      localStorage.setItem(versionKey, String(LAYOUT_VERSION));
    } catch {}
    return defaultLayout;
  });

  useEffect(() => {
    localStorage.setItem(baseKey(CONFIG_KEY, viewId), JSON.stringify(configs));
  }, [configs, viewId]);

  useEffect(() => {
    localStorage.setItem(MEDIAN_LINE_KEY, JSON.stringify(medianLine));
  }, [medianLine]);

  useEffect(() => {
    localStorage.setItem(STAT_CONFIG_KEY, JSON.stringify(statConfigs));
  }, [statConfigs]);

  useEffect(() => {
    // Sauvegarder seulement si le layout a au moins un item (évite d'écraser avec un layout vide)
    if (layout.length > 0) {
      localStorage.setItem(baseKey(LAYOUT_VERSION_KEY, viewId), String(LAYOUT_VERSION));
      localStorage.setItem(baseKey(LAYOUT_KEY, viewId), JSON.stringify(sanitizeLayout(layout)));
    }
  }, [layout, viewId]);

  const setWidgetColor = useCallback((id: string, color: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, color } : c));
  }, []);

  const setStatColor = useCallback((id: string, color: string) => {
    setStatConfigs(prev => prev.map(c => c.id === id ? { ...c, color } : c));
  }, []);

  const showWidget = useCallback((id: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, visible: true } : c));
    setLayout(prev => {
      if (prev.some(l => l.i === id)) return prev;
      const maxY = prev.reduce((m, l) => Math.max(m, l.y + l.h), 0);
      const size = WIDGET_SIZES[id] || { w: 1, h: 1 };
      return [...prev, { i: id, x: 0, y: maxY, w: size.w, h: size.h, minW: 1, minH: 1 }];
    });
  }, []);

  const hideWidget = useCallback((id: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, visible: false } : c));
  }, []);

  const toggleStat = useCallback((id: string) => {
    setStatConfigs(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  }, []);

  const toggleWidgetMedian = useCallback((id: string) => {
    setConfigs(prev => prev.map(c => c.id === id
      ? { ...c, medianVisible: c.medianVisible === false ? undefined : false }
      : c));
  }, []);

  const setMedianLineColor = useCallback((color: string) => {
    setMedianLineState(prev => ({ ...prev, color }));
  }, []);

  const setMedianLineVisible = useCallback((visible: boolean) => {
    setMedianLineState(prev => ({ ...prev, visible }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfigs(defaultConfigs);
    setLayout(defaultLayout);
    setStatConfigs(DEFAULT_STAT_CONFIGS);
  }, [defaultConfigs, defaultLayout]);

  return {
    configs,
    layout,
    setLayout,
    setWidgetColor,
    showWidget,
    hideWidget,
    resetConfig,
    statConfigs,
    setStatColor,
    toggleStat,
    medianLine,
    setMedianLineColor,
    setMedianLineVisible,
    toggleWidgetMedian,
  };
};

// Calendar widget config
export const CALENDAR_WIDGET_DEFS = [
  { id: 'win-rate', title: 'Win Rate' },
  { id: 'best-day', title: 'Best Day' },
  { id: 'worst-day', title: 'Worst Day' },
  { id: 'avg-win-loss', title: 'Average' },
  { id: 'total-win-loss', title: 'Breakdown' },
];

const CAL_CONFIG_KEY = 'calendar-widget-configs';

export const useCalendarConfig = () => {
  const [configs, setConfigs] = useState<WidgetConfig[]>(() => {
    try {
      const stored = localStorage.getItem(CAL_CONFIG_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return CALENDAR_WIDGET_DEFS.map(w => ({ id: w.id, visible: true, color: '' }));
  });

  useEffect(() => {
    localStorage.setItem(CAL_CONFIG_KEY, JSON.stringify(configs));
  }, [configs]);

  const setWidgetColor = useCallback((id: string, color: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, color } : c));
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  }, []);

  return { configs, setWidgetColor, toggleWidget };
};
