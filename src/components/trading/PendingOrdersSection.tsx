import { useState, useCallback } from 'react';
import { PendingOrder } from '@/types/pendingOrder';
import { Account } from '@/types/account';
import { PAIRS } from '@/types/trade';
import { TradeFormData } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, Zap, X, Clipboard, Trash2, Image as ImageIcon, Ban } from 'lucide-react';

interface Props {
  pendingOrders: PendingOrder[];
  accounts: Account[];
  activeAccountId: string;
  onAdd: (data: any) => void;
  onUpdate: (id: string, data: Partial<PendingOrder>) => void;
  onDelete: (id: string) => void;
  onTrigger: (id: string) => PendingOrder[] | Promise<PendingOrder[]>;
  onCancel: (id: string) => void;
  onAddTrades: (data: TradeFormData[]) => void;
}

const ORDER_TYPES = ['Buy Limit', 'Sell Limit', 'Buy Stop', 'Sell Stop'] as const;

const PendingOrdersSection = ({
  pendingOrders, accounts, activeAccountId,
  onAdd, onUpdate, onDelete, onTrigger, onCancel, onAddTrades,
}: Props) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);

  const [form, setForm] = useState({ pair: 'EURUSD', type: 'Buy Limit' as typeof ORDER_TYPES[number], note: '', screenshot: '' as string, accountIds: [activeAccountId] });
  const resetForm = () => { setForm({ pair: 'EURUSD', type: 'Buy Limit', note: '', screenshot: '', accountIds: [activeAccountId] }); };

  const toggleAccount = (id: string) => {
    setForm(p => ({ ...p, accountIds: p.accountIds.includes(id) ? p.accountIds.filter(x => x !== id) : [...p.accountIds, id] }));
  };

  const handleAddOrder = () => {
    const date = new Date().toISOString().split('T')[0];
    // shared groupId so triggering one order also triggers its siblings on the other accounts
    const groupId = crypto.randomUUID();
    form.accountIds.forEach(accountId => {
      onAdd({ date, pair: form.pair, type: form.type, note: form.note, screenshot: form.screenshot, accountId, groupId });
    });
    resetForm(); setAddDialogOpen(false);
  };

  const handlePaste = useCallback(async (setter: (url: string) => void) => {
    try { const items = await navigator.clipboard.read(); for (const item of items) { const imageType = item.types.find(t => t.startsWith('image/')); if (imageType) { const blob = await item.getType(imageType); const reader = new FileReader(); reader.onload = () => setter(reader.result as string); reader.readAsDataURL(blob); return; } } } catch {}
  }, []);

  const handleTrigger = async (order: PendingOrder) => {
    const triggered = await onTrigger(order.id);
    if (triggered.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      // one trade per account the order was placed on
      onAddTrades(triggered.map(o => ({
        date: today, endDate: today, pair: o.pair, type: o.type.includes('Buy') ? 'Buy' as const : 'Sell' as const,
        result: 0, commission: 0, swap: 0, exitType: 'Manual' as const, setupQuality: 2 as const,
        strategyRespected: true, notes: o.note, screenshots: o.screenshot ? [o.screenshot] : [], accountId: o.accountId,
      })));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Pending Orders</h2><Badge variant="secondary" className="text-[10px]">{pendingOrders.length}</Badge></div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => { resetForm(); setAddDialogOpen(true); }}><Plus className="h-3.5 w-3.5" />New Order</Button>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">No pending orders. Add your Buy/Sell Limits here.</div>
      ) : (
        <div className="grid gap-3 grid-cols-1">
          {pendingOrders.map(order => (
            <div key={order.id} className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Badge variant={order.type.includes('Buy') ? 'default' : 'destructive'} className="text-[10px]">{order.type}</Badge><span className="text-sm font-bold font-mono">{order.pair}</span></div>
                <span className="text-[10px] text-muted-foreground">{order.date}</span>
              </div>
              {order.screenshot && (<div className="rounded-md overflow-hidden border border-border"><img src={order.screenshot} alt="Setup" className="w-full h-28 object-cover" /></div>)}
              {order.note && (<p className="text-xs text-muted-foreground line-clamp-2">{order.note}</p>)}
              <div className="flex gap-1.5 pt-1 border-t border-border">
                <Button size="sm" className="flex-1 gap-1 text-[10px] h-7" onClick={() => handleTrigger(order)}><Zap className="h-3 w-3" />Trigger</Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setSelectedOrder(order)}>Details</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onCancel(order.id)}><Ban className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(order.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">New Pending Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Pair</Label><Select value={form.pair} onValueChange={v => setForm(p => ({ ...p, pair: v }))}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent>{PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Order Type</Label><Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div>
              <Label className="text-xs">Accounts</Label>
              <div className="mt-1 space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-md bg-secondary/50 border border-border">
                {accounts.map(a => (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.accountIds.includes(a.id)} onCheckedChange={() => toggleAccount(a.id)} className="h-3.5 w-3.5" />
                    <span className="text-xs">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5"><ImageIcon className="h-3 w-3" /> Entry Screenshot</Label>
              {form.screenshot ? (
                <div className="relative mt-1 rounded-md overflow-hidden border border-border"><img src={form.screenshot} alt="Setup" className="w-full h-40 object-cover" /><Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-background/80" onClick={() => setForm(p => ({ ...p, screenshot: '' }))}><X className="h-3 w-3" /></Button></div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 h-24 mt-1 rounded-md border border-dashed border-border bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors" onClick={() => handlePaste(url => setForm(p => ({ ...p, screenshot: url })))}>
                  <Clipboard className="h-4 w-4 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Click to paste screenshot</span>
                </div>
              )}
            </div>
            <div><Label className="text-xs">Note</Label><Textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Note..." className="mt-1 h-28 text-xs resize-none bg-secondary border-border" /></div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={form.accountIds.length === 0} onClick={handleAddOrder}>Create Order</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Badge variant={selectedOrder.type.includes('Buy') ? 'default' : 'destructive'} className="text-xs">{selectedOrder.type}</Badge><span className="font-mono">{selectedOrder.pair}</span></DialogTitle></DialogHeader>
              {selectedOrder.screenshot && (<div className="rounded-md overflow-hidden border border-border"><img src={selectedOrder.screenshot} alt="Setup" className="w-full object-contain max-h-64" /></div>)}
              {!selectedOrder.screenshot && (
                <div className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-md border border-dashed border-border bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors" onClick={() => handlePaste(url => { onUpdate(selectedOrder.id, { screenshot: url }); setSelectedOrder(prev => prev ? { ...prev, screenshot: url } : null); })}>
                  <Clipboard className="h-4 w-4 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Paste a screenshot</span>
                </div>
              )}
              <div><Label className="text-xs font-medium">Note</Label><Textarea value={selectedOrder.note} onChange={e => { onUpdate(selectedOrder.id, { note: e.target.value }); setSelectedOrder(prev => prev ? { ...prev, note: e.target.value } : null); }} className="mt-1 h-24 text-xs resize-none bg-secondary border-border" /></div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" className="flex-1 gap-1.5" onClick={() => { handleTrigger(selectedOrder); setSelectedOrder(null); }}><Zap className="h-3.5 w-3.5" />Trigger</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingOrdersSection;
