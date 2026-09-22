import { useState, useEffect, useCallback } from 'react';

const NAV_CONFIG_KEY = 'trading-journal-nav-config';

export interface NavItem {
  id: string;
  title: string;
  visible: boolean;
  type?: 'item' | 'separator';
}

const DEFAULT_NAV: NavItem[] = [
  { id: 'dashboard', title: 'Dashboard', visible: true },
  { id: 'calendar', title: 'Calendar', visible: true },
  { id: 'trades', title: 'Trades', visible: true },
  { id: 'reports', title: 'Reports', visible: true },
  { id: 'ai-assistant', title: 'AI Assistant', visible: true },
  { id: 'strategy', title: 'Strategy', visible: true },
  { id: 'accounts', title: 'Accounts', visible: true },
];

function loadFromStorage(): NavItem[] {
  try {
    const saved = localStorage.getItem(NAV_CONFIG_KEY);
    if (!saved) return DEFAULT_NAV;
    const parsed = JSON.parse(saved) as NavItem[];

    const migrated = parsed.map(item =>
      item.type === 'separator'
        ? item
        : item.id === 'weekly-report'
          ? { ...item, id: 'reports', title: 'Reports' }
          : item
    );

    const existingIds = new Set(
      migrated.filter(p => p.type !== 'separator').map(p => p.id)
    );

    const merged = migrated
      .filter(p => p.type === 'separator' || DEFAULT_NAV.some(d => d.id === p.id))
      .map(p => {
        if (p.type === 'separator') return p;
        const def = DEFAULT_NAV.find(d => d.id === p.id)!;
        return { ...def, visible: p.visible };
      });

    const newItems = DEFAULT_NAV.filter(d => !existingIds.has(d.id));
    return [...merged, ...newItems];
  } catch {
    return DEFAULT_NAV;
  }
}

export const useNavConfig = () => {
  const [navItems, setNavItems] = useState<NavItem[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(NAV_CONFIG_KEY, JSON.stringify(navItems));
  }, [navItems]);

  const toggleNav = useCallback((id: string) => {
    setNavItems(prev =>
      prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item)
    );
  }, []);

  const reorderNav = useCallback((items: NavItem[]) => {
    setNavItems(items);
  }, []);

  const addSeparator = useCallback(() => {
    setNavItems(prev => [
      ...prev,
      { id: `sep-${Date.now()}`, title: 'Separator', visible: true, type: 'separator' },
    ]);
  }, []);

  const removeSeparator = useCallback((id: string) => {
    setNavItems(prev => prev.filter(item => item.id !== id));
  }, []);

  return { navItems, toggleNav, reorderNav, addSeparator, removeSeparator };
};
