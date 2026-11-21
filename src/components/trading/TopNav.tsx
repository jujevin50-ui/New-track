import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings, Globe, LayoutDashboard, CalendarDays, ArrowRightLeft, BarChart3, Sparkles, BookOpen, Wallet, Banknote, Target } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useNavConfig } from '@/hooks/useNavConfig';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SettingsDialog } from './SettingsDialog';
import { CsvImportDialog } from './CsvImportDialog';
import { NotionImportDialog } from './NotionImportDialog';
import { useAccounts } from '@/hooks/useAccounts';
import { useReportReminders, type PeriodType } from '@/hooks/usePeriodReports';
import { NAV_PILL, navItemClass } from './navStyles';
import { HeaderNavLinks } from './HeaderNavLinks';

const NAV_ITEMS = [
  { id: 'dashboard', title: 'Dashboard', url: '/', Icon: LayoutDashboard },
  { id: 'fundamental-context', title: 'Contexte fondamental', url: '/contexte-fondamental', Icon: Globe },
  { id: 'calendar', title: 'Calendar', url: '/calendar', Icon: CalendarDays },
  { id: 'trades', title: 'Trades', url: '/trades', Icon: ArrowRightLeft },
  { id: 'reports', title: 'Reports', url: '/reports', Icon: BarChart3 },
  { id: 'objectives', title: 'Objectifs', url: '/objectifs', Icon: Target },
  { id: 'ai-assistant', title: 'AI Assistant', url: '/ai-assistant', Icon: Sparkles },
  { id: 'notes', title: 'Notes', url: '/notes', Icon: BookOpen },
  { id: 'strategy', title: 'Stratégie', url: '/strategy', Icon: BookOpen },
  { id: 'payout', title: 'Payout', url: '/payout', Icon: Banknote },
  { id: 'accounts', title: 'Accounts', url: '/accounts', Icon: Wallet },
];

const reportNames: Record<PeriodType, string> = {
  weekly: 'hebdomadaires',
  monthly: 'mensuels',
  yearly: 'annuels',
};

export function TopNav({ sidebar = false, utilitiesOnly = false }: { sidebar?: boolean; utilitiesOnly?: boolean } = {}) {
  const location = useLocation();
  const { theme, mode, setColor, toggleMode, presets } = useTheme();
  const { navItems, toggleNav, reorderNav, addSeparator, removeSeparator } = useNavConfig();
  const { userName, setUserName } = useUserProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [notionOpen, setNotionOpen] = useState(false);
  const { accounts } = useAccounts();
  const pendingReports = useReportReminders();
  const reportReminder = pendingReports.length ? `Rapports à rédiger : ${pendingReports.map(type => reportNames[type]).join(', ')}` : '';

  const links = navItems.filter(item => item.visible).map(item => {
    if (item.type === 'separator') {
      return sidebar ? <hr key={item.id} className="rail-nav-separator" /> : null;
    }

    const entry = NAV_ITEMS.find(link => link.id === item.id);
    if (!entry) return null;
    const reminder = entry.id === 'reports' ? reportReminder : '';

    return (
      <NavLink
        key={entry.id}
        to={entry.url}
        end={entry.url === '/'}
        title={reminder || (sidebar ? entry.title : undefined)}
        className={({ isActive }) => sidebar ? `rail-link${isActive ? ' is-current' : ''}` : navItemClass(isActive)}
      >
        <entry.Icon className="header-nav-icon" aria-hidden="true" strokeWidth={1.8} /><span className={sidebar ? 'rail-label' : undefined}>{entry.title}</span>
        {reminder && <><span className="rail-report-reminder" aria-hidden="true" /><span className="sr-only"> — {reminder}</span></>}
      </NavLink>
    );
  });
  return (
    <>
      <nav className={sidebar ? `rail-nav${utilitiesOnly ? ' rail-nav-utilities' : ''}` : NAV_PILL} aria-label={utilitiesOnly ? 'Actions de l’espace' : 'Navigation principale'}>
        {!utilitiesOnly && (sidebar ? <div className="rail-links">{links}</div> : <HeaderNavLinks activeKey={location.pathname}>{links}</HeaderNavLinks>)}
        <div className={sidebar ? 'rail-actions' : 'header-nav-actions'}>
          <button onClick={() => setSettingsOpen(true)} className={sidebar ? 'rail-settings-pill' : 'header-action'} aria-label="Settings" title="Paramètres">
            <Settings className="h-4 w-4" />{sidebar && <span className="rail-label">{userName.trim() || 'Mon profil'}</span>}
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
