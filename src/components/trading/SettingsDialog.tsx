import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Palette, LayoutGrid, Eye, EyeOff, Sun, Moon, User, FileText, Flag, GripVertical, Plus, X, Settings2, Check, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
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
  { key: 'challenge_realise' as const, label: 'Challenge réussi' },
  { key: 'challenge_echoue' as const, label: 'Challenge échoué' },
  { key: 'perte_compte' as const, label: 'Compte perdu' },
];
const SECTIONS = [
  { id: 'appearance', title: 'Apparence', description: 'Un espace à ton image', Icon: Palette },
  { id: 'profile', title: 'Profil', description: 'Ton identité dans l’application', Icon: User },
  { id: 'navigation', title: 'Navigation', description: 'Tes rubriques, dans ton ordre', Icon: LayoutGrid },
  { id: 'data', title: 'Import de données', description: 'Retrouver tes historiques', Icon: FileText },
] as const;
type Section = typeof SECTIONS[number]['id'];

function NavOrderList({ navItems, onToggle, onReorder, onAddSeparator, onRemoveSeparator }: { navItems: NavItem[]; onToggle: (id: string) => void; onReorder: (items: NavItem[]) => void; onAddSeparator: () => void; onRemoveSeparator: (id: string) => void }) {
  const [dragged, setDragged] = useState<number | null>(null);
  const move = (from: number, to: number) => { if (to < 0 || to >= navItems.length || from === to) return; const next = [...navItems]; const [item] = next.splice(from, 1); next.splice(to, 0, item); onReorder(next); };
  return <div className="space-y-2">{navItems.map((item, index) => <div key={item.id} draggable onDragStart={() => setDragged(index)} onDragEnd={() => setDragged(null)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragged !== null) move(dragged, index); setDragged(null); }} className={`flex items-center gap-2 rounded-xl border border-border/60 px-3 py-3 transition-colors ${dragged === index ? 'bg-primary/10 opacity-50' : 'bg-background/50'}`}>
    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" /><span className={`min-w-0 flex-1 text-sm ${item.visible ? 'font-medium' : 'text-muted-foreground'}`}>{item.type === 'separator' ? 'Séparateur' : item.title}</span><div className="flex shrink-0 gap-0.5"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Monter ${item.title}`} disabled={index === 0} onClick={() => move(index, index - 1)}><ChevronUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Descendre ${item.title}`} disabled={index === navItems.length - 1} onClick={() => move(index, index + 1)}><ChevronDown className="h-3.5 w-3.5" /></Button>{item.type === 'separator' ? <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Supprimer le séparateur" onClick={() => onRemoveSeparator(item.id)}><X className="h-4 w-4" /></Button> : <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`${item.visible ? 'Masquer' : 'Afficher'} ${item.title}`} aria-pressed={item.visible} onClick={() => onToggle(item.id)}>{item.visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</Button>}</div>
  </div>)}<Button type="button" variant="outline" className="w-full gap-2 border-dashed" onClick={onAddSeparator}><Plus className="h-4 w-4" />Ajouter un séparateur</Button></div>;
}

export function SettingsDialog({ open, onOpenChange, theme, presets, onSetColor, navItems, onToggleNav, onReorderNav, onAddSeparator, onRemoveSeparator, mode, onToggleMode, userName, onSetUserName, onOpenCsvImport, onOpenNotionImport }: SettingsDialogProps) {

  const { colors, setEventColor } = useEventColors();
  const [name, setName] = useState(userName);
  const [section, setSection] = useState<Section>('appearance');
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => { if (content.current) content.current.scrollTop = 0; }, [section]);
  useEffect(() => { if (open) setName(userName); }, [open, userName]);
  const current = SECTIONS.find(item => item.id === section)!;
  const close = (next: boolean) => { if (!next) onSetUserName(name); onOpenChange(next); };

  return <Dialog open={open} onOpenChange={close}><DialogContent className="settings-window gap-0 overflow-hidden border-border/60 p-0 sm:max-w-[900px]">
    <DialogHeader className="settings-heading"><div className="settings-emblem"><Settings2 className="h-5 w-5" /></div><div><DialogTitle className="text-lg font-semibold tracking-tight">Paramètres</DialogTitle><DialogDescription className="mt-1 text-xs">Personnalise ton espace Trading et Finance.</DialogDescription></div></DialogHeader>
    <div className="settings-body"><nav className="settings-menu" aria-label="Sections des paramètres">{SECTIONS.map(({ id, title, Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)} className={section === id ? 'is-current' : ''}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{title}</span></button>)}</nav>
    <div ref={content} className="settings-content"><div key={section} className="settings-panel"><header className="mb-6"><h2 className="text-xl font-semibold tracking-tight">{current.title}</h2><p className="mt-1 text-sm text-muted-foreground">{current.description}</p></header>
    {section === 'profile' && <div className="space-y-5"><div className="flex items-center gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-5"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">{(name || 'M').slice(0, 1).toLocaleUpperCase('fr-FR')}</span><div><p className="font-semibold">{name || 'Mon espace'}</p><p className="mt-1 text-xs text-muted-foreground">Visible dans ton bandeau latéral</p></div></div><div className="space-y-2"><Label htmlFor="settings-name">Nom affiché</Label><Input id="settings-name" autoComplete="nickname" value={name} onChange={event => setName(event.target.value)} onBlur={() => onSetUserName(name)} placeholder="Comment souhaites-tu être appelé ?" /></div></div>}
    {section === 'appearance' && <div className="space-y-6"><section className="settings-card"><h3>Mode d’affichage</h3><div className="mt-4 grid grid-cols-2 gap-3">{[{ value: 'light', title: 'Clair', Icon: Sun }, { value: 'dark', title: 'Sombre', Icon: Moon }].map(({ value, title, Icon }) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { if (mode !== value) onToggleMode(); }} className={`settings-mode ${mode === value ? 'is-current' : ''}`}><div className={`settings-mode-preview ${value}`}><span /><div><i /><i /><i /></div></div><span className="flex items-center justify-between text-xs font-medium"><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{title}</span>{mode === value && <Check className="h-3.5 w-3.5 text-primary" />}</span></button>)}</div></section>
    <section className="settings-card"><h3>Couleur système</h3><p className="mt-1 text-xs text-muted-foreground">Appliquée aux sélections et aux actions dans les deux espaces.</p><div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6">{presets.map(preset => { const active = preset.hue === theme.primaryHue && preset.sat === theme.primarySat && preset.light === theme.primaryLight; return <button type="button" key={preset.name} aria-pressed={active} aria-label={`Couleur ${preset.name}`} onClick={() => onSetColor(preset.hue, preset.sat, preset.light)} className="flex flex-col items-center gap-2 rounded-lg py-1"><span className={`flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 ${active ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`} style={{ background: `hsl(${preset.hue} ${preset.sat}% ${preset.light}%)` }}>{active && <span className="h-2 w-2 rounded-full bg-white shadow-sm" />}</span><span className="text-[10px] text-muted-foreground">{preset.name}</span></button>; })}</div><label htmlFor="settings-hue" className="mt-5 block text-xs font-medium">Nuance personnalisée</label><input id="settings-hue" type="range" min={0} max={360} value={theme.primaryHue} onChange={event => onSetColor(Number(event.target.value), theme.primarySat, theme.primaryLight)} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full" style={{ background: 'linear-gradient(to right,#ef4444,#eab308,#22c55e,#06b6d4,#6366f1,#d946ef,#ef4444)' }} /></section>
    <section className="settings-card"><h3 className="flex items-center gap-2"><Flag className="h-4 w-4 text-primary" />Événements du calendrier</h3><div className="mt-4 space-y-4">{EVENT_TYPES.map(event => <div key={event.key} className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-medium">{event.label}</span><div className="flex flex-wrap gap-1.5">{PRESET_COLORS.filter(color => color.value).map(color => <button type="button" key={color.name} aria-label={`${event.label} : ${color.name}`} aria-pressed={colors[event.key] === color.value} onClick={() => setEventColor(event.key, color.value)} className={`h-6 w-6 rounded-full border-2 ${colors[event.key] === color.value ? 'border-foreground' : 'border-transparent'}`} style={{ background: color.value }} />)}</div></div>)}</div></section></div>}
    {section === 'navigation' && <section className="settings-card"><h3>Navigation Trading</h3><p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">Déplace les rubriques avec les flèches ou par glisser-déposer. L’œil contrôle leur visibilité.</p><NavOrderList navItems={navItems} onToggle={onToggleNav} onReorder={onReorderNav} onAddSeparator={onAddSeparator} onRemoveSeparator={onRemoveSeparator} /></section>}
    {section === 'data' && <div className="space-y-3">{[{ title: 'Importer un fichier CSV', subtitle: 'Trades et comptes · détection des colonnes', action: onOpenCsvImport }, { title: 'Importer depuis Notion', subtitle: 'Export Markdown (.md) · trades ou comptes', action: onOpenNotionImport }].map(item => <button key={item.title} type="button" onClick={() => { close(false); item.action(); }} className="settings-import"><span className="rounded-xl bg-primary/10 p-3 text-primary"><FileText className="h-5 w-5" /></span><span className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.subtitle}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button>)}</div>}
    </div></div></div>
    <footer className="settings-footer"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Check className="h-3.5 w-3.5 text-primary" />Préférences conservées automatiquement</span><Button type="button" onClick={() => close(false)}>Terminé</Button></footer>
  </DialogContent></Dialog>;
}
