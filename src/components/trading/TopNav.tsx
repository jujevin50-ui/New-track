import SlidingRailLinks from './SlidingRailLinks';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings, LayoutDashboard, CalendarDays, ArrowRightLeft, Target, BarChart3, Sparkles, BookOpen, Wallet, Banknote } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useNavConfig } from '@/hooks/useNavConfig';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SettingsDialog } from './SettingsDialog';
import { CsvImportDialog } from './CsvImportDialog';
import { NotionImportDialog } from './NotionImportDialog';
import { useAccounts } from '@/hooks/useAccounts';
import { NAV_PILL, navItemClass } from './navStyles';
import { HeaderNavLinks } from './HeaderNavLinks';

const NAV_ITEMS = [
  { id: 'dashboard', title: 'Dashboard', url: '/', Icon: LayoutDashboard },
  { id: 'calendar', title: 'Calendar', url: '/calendar', Icon: CalendarDays },
  { id: 'trades', title: 'Trades', url: '/trades', Icon: ArrowRightLeft },
  { id: 'discipline', title: 'Discipline', url: '/discipline', Icon: Target },
  { id: 'reports', title: 'Reports', url: '/reports', Icon: BarChart3 },
  { id: 'ai-assistant', title: 'AI Assistant', url: '/ai-assistant', Icon: Sparkles },
  { id: 'strategy', title: 'Stratégie', url: '/strategy', Icon: BookOpen },
  { id: 'payout', title: 'Payout', url: '/payout', Icon: Banknote },
  { id: 'accounts', title: 'Accounts', url: '/accounts', Icon: Wallet },
];

export function TopNav({ sidebar = false, utilitiesOnly = false }: { sidebar?: boolean; utilitiesOnly?: boolean } = {}) {
  const location = useLocation();
  const { theme, mode, setColor, toggleMode, presets } = useTheme();
  const { navItems, toggleNav, reorderNav, addSeparator, removeSeparator } = useNavConfig();
  const { userName, setUserName } = useUserProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [notionOpen, setNotionOpen] = useState(false);
  const { accounts } = useAccounts();

  const navEntries = navItems
    .filter(cfg => cfg.type !== 'separator' && cfg.visible)
    .map(cfg => NAV_ITEMS.find(n => n.id === cfg.id))
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  const links = (navEntries.map(entry => (
            <NavLink
              key={entry.id}
              to={entry.url}
              end={entry.url === '/'}
              className={({ isActive }) => sidebar ? `rail-link${isActive ? ' is-current' : ''}` : navItemClass(isActive)}
            >
              <entry.Icon className="header-nav-icon" aria-hidden="true" strokeWidth={1.8} /><span>{entry.title}</span>
            </NavLink>
          )));
  return (
    <>
      <nav className={sidebar ? `rail-nav${utilitiesOnly ? ' rail-nav-utilities' : ''}` : NAV_PILL} aria-label={utilitiesOnly ? 'Actions de l’espace' : 'Navigation principale'}>
        {!utilitiesOnly && (sidebar ? <SlidingRailLinks>{links}</SlidingRailLinks> : <HeaderNavLinks activeKey={location.pathname}>{links}</HeaderNavLinks>)}
        <div className={sidebar ? 'rail-actions' : 'header-nav-actions'}>
          <button onClick={() => setSettingsOpen(true)} className={sidebar ? 'rail-settings-pill' : 'header-action'} aria-label="Settings">
            <Settings className="h-4 w-4" />{sidebar && <span>{userName.trim() || 'Mon profil'}</span>}
          </button>

        </div>
      </nav>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        presets={presets}
        onSetColor={setColor}
        navItems={navItems}
        onToggleNav={toggleNav}
        onReorderNav={reorderNav}
        onAddSeparator={addSeparator}
        onRemoveSeparator={removeSeparator}
        mode={mode}
        onToggleMode={toggleMode}
        userName={userName}
        onSetUserName={setUserName}
        onOpenCsvImport={() => setCsvOpen(true)}
        onOpenNotionImport={() => setNotionOpen(true)}
      />
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} accounts={accounts} />
      <NotionImportDialog open={notionOpen} onOpenChange={setNotionOpen} accounts={accounts} />
    </>
  );
}
