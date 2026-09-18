import { useState } from 'react';
import { BarChart3, List, Wallet, CalendarDays, ClipboardList, LogOut, Settings, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useTheme } from '@/hooks/useTheme';
import { useNavConfig } from '@/hooks/useNavConfig';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useData } from '@/contexts/DataContext';
import { SettingsDialog } from './SettingsDialog';
import { CsvImportDialog } from './CsvImportDialog';
import { NotionImportDialog } from './NotionImportDialog';
import { useAccounts } from '@/hooks/useAccounts';

const NAV_ITEMS = [
  { id: 'dashboard',      title: 'Dashboard',       url: '/',               icon: BarChart3 },
  { id: 'calendar',       title: 'Calendar',         url: '/calendar',       icon: CalendarDays },
  { id: 'trades',         title: 'Trades',           url: '/trades',         icon: List },
  { id: 'weekly-report',  title: 'Weekly Report',    url: '/weekly-report',  icon: ClipboardList },
  { id: 'ai-assistant',   title: 'AI Assistant',     url: '/ai-assistant',   icon: Sparkles },
  { id: 'accounts',       title: 'Accounts',         url: '/accounts',       icon: Wallet },
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
          px-1.5 py-1.5 rounded-full
          bg-white/10 dark:bg-white/[0.06]
          backdrop-blur-2xl backdrop-saturate-150
          border border-white/25 dark:border-white/10
          shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.35)]
          ring-1 ring-black/5
          max-w-[95vw]
        "
      >
        {/* reflet lumineux du haut, effet "liquid glass" */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {navEntries.map(entry => {
            const Icon = entry.icon;
            return (
              <NavLink
                key={entry.id}
                to={entry.url}
                end={entry.url === '/'}
                className="
                  flex items-center gap-1.5 whitespace-nowrap
                  px-3.5 py-2 rounded-full
                  text-[13px] font-medium text-foreground/70
                  hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10
                  transition-all
                "
                activeClassName="!bg-gradient-to-r !from-black !to-primary !text-white !shadow-md"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{entry.title}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="w-px h-5 bg-white/30 dark:bg-white/15 mx-1 shrink-0" />

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full text-foreground/60 hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={disconnect}
            className="p-2 rounded-full text-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Changer de fichier"
          >
            <LogOut className="h-3.5 w-3.5" />
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
