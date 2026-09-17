import { useState } from 'react';
import { BarChart3, List, Wallet, CalendarDays, ClipboardList, LogOut, Settings, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useTheme } from '@/hooks/useTheme';
import { useNavConfig } from '@/hooks/useNavConfig';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from './SettingsDialog';
import { CsvImportDialog } from './CsvImportDialog';
import { NotionImportDialog } from './NotionImportDialog';
import { useAccounts } from '@/hooks/useAccounts';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { id: 'dashboard',      title: 'Dashboard',       url: '/',               icon: BarChart3 },
  { id: 'calendar',       title: 'Calendar',         url: '/calendar',       icon: CalendarDays },
  { id: 'trades',         title: 'Trades',           url: '/trades',         icon: List },
  { id: 'weekly-report',  title: 'Weekly Report',    url: '/weekly-report',  icon: ClipboardList },
  { id: 'ai-assistant',   title: 'AI Assistant',     url: '/ai-assistant',   icon: Sparkles },
  { id: 'accounts',       title: 'Accounts',         url: '/accounts',       icon: Wallet },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { disconnect } = useData();
  const { theme, mode, setColor, toggleMode, presets } = useTheme();
  const { navItems, toggleNav, reorderNav, addSeparator, removeSeparator } = useNavConfig();
  const { userName, setUserName } = useUserProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [notionOpen, setNotionOpen] = useState(false);
  const { accounts } = useAccounts();

  const displayName = userName || 'Vernant fx';

  // Build sidebar entries in navConfig order, respecting separators
  const sidebarEntries = navItems
    .map(cfg => {
      if (cfg.type === 'separator') {
        return { isSeparator: true as const, id: cfg.id, url: '', icon: null, title: '' };
      }
      if (!cfg.visible) return null;
      const item = NAV_ITEMS.find(n => n.id === cfg.id);
      if (!item) return null;
      return { isSeparator: false as const, ...item };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        <div className={`h-14 px-4 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} shrink-0`}>
          <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0">
            <img src="/goggins.svg" alt="Goggins" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-medium tracking-tight truncate text-sidebar-foreground">{displayName}</h1>
            </div>
          )}
        </div>

        <SidebarContent className="py-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarEntries.map(entry => {
                  if (entry.isSeparator) {
                    return (
                      <div
                        key={entry.id}
                        className={`h-px bg-border/50 my-1.5 ${collapsed ? 'mx-1' : 'mx-3'}`}
                      />
                    );
                  }
                  const Icon = entry.icon!;
                  return (
                    <SidebarMenuItem key={entry.id}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={entry.url}
                          end={entry.url === '/'}
                          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-lg transition-colors"
                          activeClassName="!bg-gradient-to-r from-black to-primary !text-white font-semibold"
                        >
                          <Icon className="mr-2.5 h-4 w-4" />
                          {!collapsed && <span className="text-[13px]">{entry.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className="p-3 border-t border-sidebar-border space-y-1.5">
          <Button
            variant="ghost" size="sm"
            className="w-full justify-start text-xs text-muted-foreground gap-2.5 h-8 hover:text-foreground hover:bg-sidebar-accent transition-colors"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-3.5 w-3.5" />
            {!collapsed && 'Settings'}
          </Button>
          <Button
            variant="ghost" size="sm"
            className="w-full justify-start text-xs text-muted-foreground gap-2.5 h-8 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={disconnect}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && 'Changer de fichier'}
          </Button>
        </div>
      </Sidebar>

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
