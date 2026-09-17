import { useState, useMemo } from 'react';
import { Trade, getNetResult } from '@/types/trade';
import { Account } from '@/types/account';
import PendingOrdersWidget from '@/components/trading/PendingOrdersWidget';
import DailyJournalWidget from '@/components/trading/DailyJournalWidget';
import LiveTradesWidget from '@/components/trading/LiveTradesWidget';
import ProfitPerTradeChart from '@/components/trading/ProfitPerTradeChart';
import TradingViewWidget from '@/components/trading/TradingViewWidget';
import { WidgetColorPicker } from '@/components/trading/WidgetColorPicker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAnalysisSynthesis } from '@/hooks/useAnalysisSynthesis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, X, Plus, RotateCcw, EyeOff, Activity, Target, Brain, BarChart3, TrendingUp, Wallet, Pencil, Monitor, BookOpen, Trash2, Save } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { PAIRS } from '@/types/trade';

const ResponsiveGrid = WidthProvider(Responsive);

interface Props {
  trades: Trade[];
  allTrades: Trade[];
  accounts: Account[];
}

interface AnalyseWidget {
  id: string;
  title: string;
  icon: typeof Activity;
  visible: boolean;
  color: string;
  // TradingView chart config
  tvSymbol?: string;
  tvInterval?: string;
}

interface LayoutItem { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }

const STATIC_WIDGETS: { id: string; title: string; icon: typeof Activity }[] = [
  { id: 'live-trades',      title: 'Live Trades',        icon: Activity },
  { id: 'pending-orders',   title: 'Pending Orders',     icon: Activity },
  { id: 'daily-journal',    title: "Today's Journal",    icon: Brain },
  { id: 'profit-per-trade', title: 'Profit per Trade',   icon: BarChart3 },
  { id: 'synthesis',        title: 'Analysis Syntheses', icon: BookOpen },
];

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'live-trades',      x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'pending-orders',   x: 4, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'daily-journal',    x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'profit-per-trade', x: 0, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
  { i: 'synthesis',        x: 4, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
];

const DEFAULT_WIDGETS: AnalyseWidget[] = STATIC_WIDGETS.map(w => ({ ...w, visible: true, color: '' }));

const LAYOUT_KEY = 'analyse-view-layout-v3';
const CONFIG_KEY = 'analyse-view-configs-v3';
const ACCOUNTS_KEY = 'analyse-view-account-ids-v1';

const TV_INTERVALS = ['1', '5', '15', '30', '60', '240', 'D', 'W'];

const AnalyseDashboard = ({ trades, allTrades, accounts }: Props) => {
  const { userName } = useUserProfile();
  const { syntheses, addSynthesis, updateSynthesis, deleteSynthesis } = useAnalysisSynthesis();

  const [editMode, setEditMode] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [tvConfigOpen, setTvConfigOpen] = useState<string | null>(null);
  const [addTvOpen, setAddTvOpen] = useState(false);
  const [newTvSymbol, setNewTvSymbol] = useState('FX:EURUSD');
  const [newTvInterval, setNewTvInterval] = useState('60');
  const [addSynthOpen, setAddSynthOpen] = useState(false);
  const [synthTitle, setSynthTitle] = useState('');
  const [synthContent, setSynthContent] = useState('');
  const [editingSynthId, setEditingSynthId] = useState<string | null>(null);

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem(ACCOUNTS_KEY); if (s) return JSON.parse(s); } catch {}
    return [];
  });

  const persistAccounts = (ids: string[]) => { setSelectedAccountIds(ids); localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(ids)); };
  const toggleAccount = (id: string) => persistAccounts(selectedAccountIds.includes(id) ? selectedAccountIds.filter(x => x !== id) : [...selectedAccountIds, id]);

  const [widgets, setWidgets] = useState<AnalyseWidget[]>(() => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // merge static + stored TV widgets
        const staticIds = new Set(STATIC_WIDGETS.map(w => w.id));
        const tvWidgets = parsed.filter((w: any) => w.id.startsWith('tv-'));
        return [
          ...STATIC_WIDGETS.map(w => {
            const found = parsed.find((p: any) => p.id === w.id);
            return { ...w, visible: found?.visible ?? true, color: found?.color ?? '' };
          }),
          ...tvWidgets.map((w: any) => ({ ...w, icon: Monitor })),
        ];
      }
    } catch {}
    return DEFAULT_WIDGETS;
  });

  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try { const s = localStorage.getItem(LAYOUT_KEY); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_LAYOUT;
  });

  const persist = (newLayout: LayoutItem[], newWidgets?: AnalyseWidget[]) => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newLayout));
    if (newWidgets) localStorage.setItem(CONFIG_KEY, JSON.stringify(newWidgets.map(w => ({ id: w.id, visible: w.visible, color: w.color, title: w.title, tvSymbol: w.tvSymbol, tvInterval: w.tvInterval }))));
  };

  const handleLayoutChange = (newLayout: LayoutItem[]) => { setLayout(newLayout); persist(newLayout); };
  const setWidgetColor = (id: string, color: string) => setWidgets(prev => { const u = prev.map(w => w.id === id ? { ...w, color } : w); persist(layout, u); return u; });
  const showWidget = (id: string) => {
    setWidgets(prev => {
      const u = prev.map(w => w.id === id ? { ...w, visible: true } : w);
      const newLayout = layout.some(l => l.i === id) ? layout : [...layout, { i: id, x: 0, y: 99, w: 6, h: 5, minW: 3, minH: 3 }];
      persist(newLayout, u);
      if (newLayout !== layout) setLayout(newLayout);
      return u;
    });
  };
  const hideWidget = (id: string) => setWidgets(prev => { const u = prev.map(w => w.id === id ? { ...w, visible: false } : w); persist(layout, u); return u; });

  const addTvChart = () => {
    const id = `tv-${Date.now()}`;
    const newWidget: AnalyseWidget = { id, title: `${newTvSymbol} · ${newTvInterval}m`, icon: Monitor, visible: true, color: '', tvSymbol: newTvSymbol, tvInterval: newTvInterval };
    const newLayout = [...layout, { i: id, x: 0, y: 99, w: 6, h: 6, minW: 3, minH: 4 }];
    setWidgets(prev => { const u = [...prev, newWidget]; persist(newLayout, u); return u; });
    setLayout(newLayout);
    setAddTvOpen(false);
  };

  const removeTvChart = (id: string) => {
    setWidgets(prev => { const u = prev.filter(w => w.id !== id); persist(layout.filter(l => l.i !== id), u); return u; });
    setLayout(prev => prev.filter(l => l.i !== id));
  };

  const updateTvConfig = (id: string, symbol: string, interval: string) => {
    setWidgets(prev => { const u = prev.map(w => w.id === id ? { ...w, tvSymbol: symbol, tvInterval: interval, title: `${symbol} · ${interval}m` } : w); persist(layout, u); return u; });
    setTvConfigOpen(null);
  };

  const resetView = () => { setWidgets(DEFAULT_WIDGETS); setLayout(DEFAULT_LAYOUT); persist(DEFAULT_LAYOUT, DEFAULT_WIDGETS); };

  const accountStats = useMemo(() => {
    return selectedAccountIds.map(id => accounts.find(a => a.id === id)).filter((a): a is Account => !!a)
      .map(a => {
        const accTrades = allTrades.filter(t => t.accountId === a.id);
        const profit = accTrades.reduce((s, t) => s + getNetResult(t), 0);
        return { account: a, profit, balance: a.initialBalance + profit, pct: a.initialBalance > 0 ? (profit / a.initialBalance) * 100 : 0 };
      });
  }, [selectedAccountIds, accounts, allTrades]);

  const visibleWidgets = widgets.filter(w => w.visible);
  const hiddenWidgets = widgets.filter(w => !w.visible);
  const visibleLayout = layout.filter(l => visibleWidgets.some(w => w.id === l.i));

  const renderWidget = (w: AnalyseWidget) => {
    if (w.id.startsWith('tv-')) return <TradingViewWidget symbol={w.tvSymbol} interval={w.tvInterval} />;
    switch (w.id) {
      case 'live-trades':      return <LiveTradesWidget trades={allTrades} accounts={accounts} accentColor={w.color || undefined} />;
      case 'pending-orders':   return <PendingOrdersWidget accentColor={w.color || undefined} />;
      case 'daily-journal':    return <DailyJournalWidget accentColor={w.color || undefined} />;
      case 'profit-per-trade': return <ProfitPerTradeChart trades={trades} accounts={accounts} accentColor={w.color || undefined} />;
      case 'synthesis':        return <SynthesisWidget syntheses={syntheses} onAdd={() => setAddSynthOpen(true)} onEdit={(id) => { const s = syntheses.find(x => x.id === id); if (s) { setSynthTitle(s.title); setSynthContent(s.content); setEditingSynthId(id); setAddSynthOpen(true); } }} onDelete={deleteSynthesis} />;
      default: return null;
    }
  };

  const displayName = userName || 'Vernant fx';

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_50%)] pointer-events-none" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
                <p className="text-[11px] text-muted-foreground">Live analysis dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {editMode && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAddTvOpen(true)}>
                    <Monitor className="h-3.5 w-3.5" />
                    Add TradingView Chart
                  </Button>
                  <Popover open={accountPickerOpen} onOpenChange={setAccountPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Pencil className="h-3.5 w-3.5" />
                        Accounts ({selectedAccountIds.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="end">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-2">Select accounts</div>
                      <div className="max-h-72 overflow-auto space-y-0.5">
                        {accounts.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground text-center">No accounts</div>}
                        {accounts.map(a => (
                          <label key={a.id} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-sm">
                            <Checkbox checked={selectedAccountIds.includes(a.id)} onCheckedChange={() => toggleAccount(a.id)} />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-semibold truncate">{a.name}</span>
                              <span className="text-[10px] text-muted-foreground truncate">{a.broker} · {a.currency}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="sm" onClick={resetView} className="gap-1.5 text-xs text-muted-foreground">
                    <RotateCcw className="h-3.5 w-3.5" />Reset
                  </Button>
                </>
              )}
              <Button variant={editMode ? 'default' : 'outline'} size="sm" onClick={() => setEditMode(!editMode)} className="gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" />
                {editMode ? 'Done' : 'Customize'}
              </Button>
            </div>
          </div>

          {accountStats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {accountStats.map(({ account, balance, pct, profit }) => {
                const isProfit = profit >= 0;
                const c = isProfit ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
                return (
                  <div key={account.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border bg-card/80" style={{ borderColor: `${c}40` }}>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c}20`, color: c }}><Wallet className="h-3.5 w-3.5" /></div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold leading-tight">{account.name}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{account.broker}</span>
                    </div>
                    <div className="h-7 w-px bg-border mx-1" />
                    <div className="flex flex-col items-end">
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: c }}>{isProfit ? '+' : ''}{pct.toFixed(2)}%</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{account.currency} {(balance >= 1000 ? `${(balance/1000).toFixed(1)}K` : balance.toFixed(0))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editMode && hiddenWidgets.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-dashed border-border bg-secondary/30">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider self-center mr-2"><EyeOff className="h-3 w-3 inline mr-1" />Hidden:</span>
          {hiddenWidgets.map(w => (
            <Button key={w.id} variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => showWidget(w.id)}>
              <Plus className="h-3 w-3" />{w.title}
            </Button>
          ))}
        </div>
      )}

      <ResponsiveGrid
        layouts={{ lg: visibleLayout }}
        cols={{ lg: 12, md: 8, sm: 4, xs: 2, xxs: 1 }}
        rowHeight={90}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableCancel=".no-drag"
        margin={[14, 14] as [number, number]}
        containerPadding={[0, 0] as [number, number]}
        useCSSTransforms
        breakpoints={{ lg: 900, md: 700, sm: 500, xs: 400, xxs: 0 }}
      >
        {visibleWidgets.map(w => {
          const Icon = w.icon;
          const accent = w.color || 'hsl(var(--primary))';
          const isTv = w.id.startsWith('tv-');
          return (
            <div key={w.id} className={`group rounded-2xl overflow-hidden border bg-card transition-all duration-200 ${editMode ? 'ring-1 ring-primary/30 shadow-md' : 'hover:border-border/80'}`} style={{ borderColor: w.color ? `${w.color}50` : undefined }}>
              <div className={`h-full flex flex-col ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: w.color ? `${w.color}30` : undefined, backgroundColor: w.color ? `${w.color}08` : undefined }}>
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20`, color: accent }}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-[12px] font-semibold tracking-tight">{w.title}</h3>
                  </div>
                  {editMode && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity no-drag">
                      {isTv && (
                        <button onClick={() => setTvConfigOpen(w.id)} className="no-drag p-1 rounded hover:bg-accent transition-colors" title="Configure">
                          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      {!isTv && <WidgetColorPicker color={w.color} onChange={(c) => setWidgetColor(w.id, c)} />}
                      {isTv ? (
                        <button onClick={() => removeTvChart(w.id)} className="no-drag p-1 rounded hover:bg-destructive/20 transition-colors" title="Remove">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      ) : (
                        <button onClick={() => hideWidget(w.id)} className="no-drag p-1 rounded hover:bg-destructive/20 transition-colors" title="Hide">
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-h-0 p-3">
                  {renderWidget(w)}
                </div>
              </div>
            </div>
          );
        })}
      </ResponsiveGrid>

      {/* Add TradingView Dialog */}
      <Dialog open={addTvOpen} onOpenChange={setAddTvOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Add TradingView Chart</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Symbol (TradingView format)</label>
              <Select value={newTvSymbol} onValueChange={setNewTvSymbol}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAIRS.map(p => <SelectItem key={p} value={p.includes('XAU') ? 'OANDA:XAUUSD' : p.includes('BTC') ? 'BINANCE:BTCUSDT' : `FX:${p}`}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={newTvSymbol} onChange={e => setNewTvSymbol(e.target.value)} placeholder="e.g. FX:EURUSD" className="h-9 text-xs mt-1" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Timeframe</label>
              <div className="flex flex-wrap gap-2">
                {TV_INTERVALS.map(i => (
                  <button key={i} onClick={() => setNewTvInterval(i)} className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${newTvInterval === i ? 'bg-primary/15 border-primary/50 text-primary' : 'bg-secondary border-border text-muted-foreground'}`}>{i}</button>
                ))}
              </div>
            </div>
            <Button className="w-full text-xs" onClick={addTvChart}>Add Chart</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configure TradingView Dialog */}
      {tvConfigOpen && (() => {
        const w = widgets.find(x => x.id === tvConfigOpen);
        if (!w) return null;
        let sym = w.tvSymbol || 'FX:EURUSD';
        let intv = w.tvInterval || '60';
        return (
          <Dialog open onOpenChange={() => setTvConfigOpen(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle className="text-sm">Configure Chart — {w.title}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                  <Input defaultValue={sym} onChange={e => { sym = e.target.value; }} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Timeframe</label>
                  <div className="flex flex-wrap gap-2">
                    {TV_INTERVALS.map(i => (
                      <button key={i} onClick={() => { intv = i; }} className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${intv === i ? 'bg-primary/15 border-primary/50 text-primary' : 'bg-secondary border-border text-muted-foreground'}`}>{i}</button>
                    ))}
                  </div>
                </div>
                <Button className="w-full text-xs" onClick={() => updateTvConfig(tvConfigOpen, sym, intv)}>Apply</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Add/Edit Synthesis Dialog */}
      <Dialog open={addSynthOpen} onOpenChange={(o) => { if (!o) { setAddSynthOpen(false); setEditingSynthId(null); setSynthTitle(''); setSynthContent(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editingSynthId ? 'Edit Synthesis' : 'Add Synthesis'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={synthTitle} onChange={e => setSynthTitle(e.target.value)} placeholder="e.g. EURUSD — Week 18 Overview" className="h-9 text-xs mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Content</label>
              <Textarea value={synthContent} onChange={e => setSynthContent(e.target.value)} placeholder="Write your analysis synthesis here..." className="min-h-[140px] text-xs mt-1 resize-none" />
            </div>
            <Button className="w-full text-xs gap-2" onClick={() => {
              if (editingSynthId) updateSynthesis(editingSynthId, { title: synthTitle, content: synthContent });
              else addSynthesis(synthTitle, synthContent);
              setAddSynthOpen(false); setEditingSynthId(null); setSynthTitle(''); setSynthContent('');
            }}>
              <Save className="h-3.5 w-3.5" />
              {editingSynthId ? 'Update' : 'Save Synthesis'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── Synthesis Widget ── */
const SynthesisWidget = ({ syntheses, onAdd, onEdit, onDelete }: {
  syntheses: ReturnType<typeof useAnalysisSynthesis>['syntheses'];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  if (syntheses.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
      <p className="text-xs text-muted-foreground">No synthesis yet.</p>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs no-drag" onClick={onAdd}><Plus className="h-3 w-3" />Add Synthesis</Button>
    </div>
  );
  return (
    <div className="h-full flex flex-col gap-2 overflow-auto no-drag">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-6 no-drag" onClick={onAdd}><Plus className="h-3 w-3" />Add</Button>
      </div>
      <div className="space-y-2 overflow-auto">
        {syntheses.map(s => (
          <div key={s.id} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-semibold truncate flex-1">{s.title}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(s.id)} className="p-0.5 rounded hover:bg-accent no-drag"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                <button onClick={() => onDelete(s.id)} className="p-0.5 rounded hover:bg-destructive/20 no-drag"><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-1">{s.date}</p>
            <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyseDashboard;
