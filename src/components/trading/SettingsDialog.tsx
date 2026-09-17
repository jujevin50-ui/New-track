import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Palette, LayoutGrid, Eye, EyeOff, Sun, Moon, User, FileText, Flag, GripVertical, Plus, X } from 'lucide-react';
import { NavItem } from '@/hooks/useNavConfig';
import { ThemeMode } from '@/hooks/useTheme';
import { useEventColors } from '@/hooks/useEventColors';
import { PRESET_COLORS } from '@/hooks/useDashboardConfig';

interface Preset { name: string; hue: number; sat: number; light: number; }

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: { primaryHue: number; primarySat: number; primaryLight: number };
  presets: Preset[];
  onSetColor: (hue: number, sat: number, light: number) => void;
  navItems: NavItem[];
  onToggleNav: (id: string) => void;
  onReorderNav: (items: NavItem[]) => void;
  onAddSeparator: () => void;
  onRemoveSeparator: (id: string) => void;
  mode: ThemeMode;
  onToggleMode: () => void;
  userName: string;
  onSetUserName: (name: string) => void;
  onOpenCsvImport: () => void;
  onOpenNotionImport: () => void;
}

const EVENT_TYPES = [
  { key: 'challenge_realise' as const, label: 'Challenge Passed' },
  { key: 'challenge_echoue'  as const, label: 'Challenge Failed' },
  { key: 'perte_compte'      as const, label: 'Account Blown' },
];

// ── Drag-and-drop nav list ──────────────────────────────────────────────────

function NavOrderList({
  navItems,
  onToggle,
  onReorder,
  onAddSeparator,
  onRemoveSeparator,
}: {
  navItems: NavItem[];
  onToggle: (id: string) => void;
  onReorder: (items: NavItem[]) => void;
  onAddSeparator: () => void;
  onRemoveSeparator: (id: string) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const reset = () => { setDragIdx(null); setDropIdx(null); };

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) { reset(); return; }
    const newItems = [...navItems];
    const [moved] = newItems.splice(dragIdx, 1);
    const newIdx = dragIdx < targetIdx ? targetIdx - 1 : targetIdx;
    newItems.splice(newIdx, 0, moved);
    onReorder(newItems);
    reset();
  };

  return (
    <div className="space-y-1">
      {navItems.map((item, i) => {
        const isSep = item.type === 'separator';
        const isDragging = dragIdx === i;
        const isDropTarget = dropIdx === i && dragIdx !== null && dragIdx !== i;

        return (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragEnd={reset}
            onDragOver={e => { e.preventDefault(); if (dragIdx !== i) setDropIdx(i); }}
            onDragLeave={() => setDropIdx(null)}
            onDrop={() => handleDrop(i)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
              isDragging
                ? 'opacity-40 border-border bg-secondary/30'
                : isDropTarget
                ? 'border-primary bg-primary/8'
                : isSep
                ? 'border-border/40 bg-secondary/20'
                : item.visible
                ? 'border-border bg-secondary/40'
                : 'border-border/30 bg-transparent'
            }`}
          >
            {/* Drag handle */}
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />

            {/* Label */}
            {isSep ? (
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide uppercase">sep</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
            ) : (
              <span className={`flex-1 text-xs font-medium ${item.visible ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                {item.title}
              </span>
            )}

            {/* Action */}
            {isSep ? (
              <button
                onClick={() => onRemoveSeparator(item.id)}
                className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onToggle(item.id)}
                className="p-0.5 rounded hover:bg-secondary transition-colors"
              >
                {item.visible
                  ? <Eye className="h-3.5 w-3.5 text-primary" />
                  : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />}
              </button>
            )}
          </div>
        );
      })}

      {/* Add separator */}
      <button
        onClick={onAddSeparator}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border/50 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors mt-1"
      >
        <Plus className="h-3 w-3" />
        Add separator
      </button>
    </div>
  );
}

// ── Dialog ──────────────────────────────────────────────────────────────────

export function SettingsDialog({
  open, onOpenChange, theme, presets, onSetColor,
  navItems, onToggleNav, onReorderNav, onAddSeparator, onRemoveSeparator,
  mode, onToggleMode, userName, onSetUserName, onOpenCsvImport, onOpenNotionImport,
}: SettingsDialogProps) {
  const [nameInput, setNameInput] = useState(userName);
  const { colors: evtColors, setEventColor } = useEventColors();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSetUserName(nameInput); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm bg-card border-border/60 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">

          {/* Username */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Display Name</p>
            </div>
            <Input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={() => onSetUserName(nameInput)}
              placeholder="Your name (e.g. VernantFX)"
              className="h-9 text-sm bg-secondary border-border"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Shown in the sidebar and header</p>
          </div>

          {/* Mode toggle */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium">Display Mode</p>
            <div className="flex gap-2">
              <button
                onClick={mode === 'dark' ? undefined : onToggleMode}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  mode === 'dark' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-secondary/50 border-border text-muted-foreground'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                onClick={mode === 'light' ? undefined : onToggleMode}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  mode === 'light' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-secondary/50 border-border text-muted-foreground'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
            </div>
          </div>

          {/* Accent color */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium">Accent Color</p>
            <div className="grid grid-cols-7 gap-2.5">
              {presets.map(p => {
                const isActive = p.hue === theme.primaryHue && p.sat === theme.primarySat;
                return (
                  <button key={p.name} onClick={() => onSetColor(p.hue, p.sat, p.light)} className="group flex flex-col items-center gap-1.5" title={p.name}>
                    <div
                      className={`h-9 w-9 rounded-full transition-all duration-200 ${isActive ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110' : 'hover:scale-110 hover:shadow-lg'}`}
                      style={{ backgroundColor: `hsl(${p.hue}, ${p.sat}%, ${p.light}%)` }}
                    />
                    <span className={`text-[9px] transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom hue */}
          <div>
            <p className="text-xs text-muted-foreground mb-2.5 font-medium">Custom Hue</p>
            <input
              type="range" min={0} max={360} value={theme.primaryHue}
              onChange={e => onSetColor(Number(e.target.value), theme.primarySat, theme.primaryLight)}
              className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, hsl(0,70%,55%), hsl(60,70%,55%), hsl(120,70%,55%), hsl(180,70%,55%), hsl(240,70%,55%), hsl(300,70%,55%), hsl(360,70%,55%))` }}
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50">
            <div className="h-10 w-10 rounded-xl shadow-lg" style={{ backgroundColor: `hsl(${theme.primaryHue}, ${theme.primarySat}%, ${theme.primaryLight}%)` }} />
            <div>
              <p className="text-xs font-medium">Active Color</p>
              <p className="text-[10px] text-muted-foreground font-mono">hsl({theme.primaryHue}, {theme.primarySat}%, {theme.primaryLight}%)</p>
            </div>
          </div>

          {/* CSV Import */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Import données</p>
            </div>
            <button
              onClick={() => { onOpenChange(false); onOpenCsvImport(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/50 text-xs font-medium hover:bg-muted transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              Importer un fichier CSV
            </button>
            <p className="text-[10px] text-muted-foreground mt-1 mb-2">Compatible export Lovable · Détection automatique</p>
            <button
              onClick={() => { onOpenChange(false); onOpenNotionImport(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/50 text-xs font-medium hover:bg-muted transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              Importer depuis Notion (.md)
            </button>
            <p className="text-[10px] text-muted-foreground mt-1">Export Notion en Markdown · Trades ou Comptes</p>
          </div>

          {/* Event Colors */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flag className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Event Colors</p>
            </div>
            <div className="space-y-3">
              {EVENT_TYPES.map(e => (
                <div key={e.key} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium" style={{ color: evtColors[e.key] }}>{e.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.filter(c => c.value).map(c => (
                      <button
                        key={c.name}
                        onClick={() => setEventColor(e.key, c.value)}
                        title={c.name}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                          evtColors[e.key] === c.value ? 'border-foreground ring-1 ring-foreground/30 scale-110' : 'border-border/40'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation order */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Navigation</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">Drag to reorder · eye to show/hide · add separators</p>
            <NavOrderList
              navItems={navItems}
              onToggle={onToggleNav}
              onReorder={onReorderNav}
              onAddSeparator={onAddSeparator}
              onRemoveSeparator={onRemoveSeparator}
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
