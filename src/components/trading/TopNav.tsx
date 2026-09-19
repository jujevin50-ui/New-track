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

const NAV_ITEMS = [
  { id: 'dashboard',      title: 'Dashboard',       url: '/' },
  { id: 'calendar',       title: 'Calendar',         url: '/calendar' },
  { id: 'trades',         title: 'Trades',           url: '/trades' },
  { id: 'weekly-report',  title: 'Weekly Report',    url: '/weekly-report' },
  { id: 'ai-assistant',   title: 'AI Assistant',     url: '/ai-assistant' },
  { id: 'accounts',       title: 'Accounts',         url: '/accounts' },
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

  // Build entries in navConfig order, ignoring separators (pas de sens dans une barre horizontale)
  const navEntries = navItems
    .filter(cfg => cfg.type !== 'separator' && cfg.visible)
    .map(cfg => NAV_ITEMS.find(n => n.id === cfg.id))
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  return (
    <>
      <nav
        className="
          fixed top-4 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-1
          px-2 py-2 rounded-full
          bg-[#141414]
          border border-white/[0.06]
          shadow-[0_10px_40px_rgba(0,0,0,0.55)]
          max-w-[95vw]
        "
      >
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navEntries.map(entry => (
            <NavLink
              key={entry.id}
              to={entry.url}
              end={entry.url === '/'}
              className={({ isActive }) => `
                flex flex-col items-center justify-center whitespace-nowrap
                px-5 py-2.5 rounded-full
                text-[14px] font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-white/[0.09] text-white font-semibold'
                  : 'text-white/40 hover:text-white/90 hover:bg-white/[0.05]'}
              `}
            >
              {({ isActive }) => (
                <>
                  <span>{entry.title}</span>
                  <span
                    className={`h-1 w-1 rounded-full bg-green-400 mt-1 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="w-px h-5 bg-white/[0.08] mx-1 shrink-0" />

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-full text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={disconnect}
            className="p-2.5 rounded-full text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            aria-label="Changer de fichier"
          >
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
