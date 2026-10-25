import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useNavConfig } from '@/hooks/useNavConfig';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useData } from '@/contexts/DataContext';
import { SettingsDialog } from './SettingsDialog';
import { CsvImportDialog } from './CsvImportDialog';
import { NotionImportDialog } from './NotionImportDialog';
import { useAccounts } from '@/hooks/useAccounts';
import { NAV_PILL, navItemClass } from './navStyles';

const NAV_ITEMS = [
  { id: 'dashboard', title: 'Dashboard', url: '/' },
  { id: 'calendar', title: 'Calendar', url: '/calendar' },
  { id: 'daily-report', title: 'Bilan', url: '/daily-report' },
  { id: 'trades', title: 'Trades', url: '/trades' },
  { id: 'reports', title: 'Reports', url: '/reports' },
  { id: 'ai-assistant', title: 'AI Assistant', url: '/ai-assistant' },
  { id: 'accounts', title: 'Accounts', url: '/accounts' },
];

export function TopNav() {
  const { disconnect } = useData();
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

  return (
    <>
      <nav className={NAV_PILL} aria-label="Navigation principale">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
          {navEntries.map(entry => (
            <NavLink
              key={entry.id}
              to={entry.url}
              end={entry.url === '/'}
              className={({ isActive }) => navItemClass(isActive)}
            >
              {entry.title}
            </NavLink>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => setSettingsOpen(true)} className="h-10 w-10 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </button>
          <button onClick={disconnect} className="h-10 w-10 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-loss hover:bg-loss-soft transition-colors" aria-label="Changer de fichier">
            <LogOut className="h-4 w-4" />
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
