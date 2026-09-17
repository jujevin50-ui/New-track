import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, Zap } from 'lucide-react';
import { Account } from '@/types/account';

interface PayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (accountId: string, amount: number, date: string, note: string) => void;
  accounts: Account[];
  defaultAccountId?: string;
  accountProfits?: Record<string, number>;
}

const today = () => new Date().toISOString().slice(0, 10);

const fmt2 = (n: number) => n.toFixed(2);

const PayoutDialog = ({ open, onOpenChange, onSubmit, accounts, defaultAccountId, accountProfits = {} }: PayoutDialogProps) => {
  const activeAccounts = accounts.filter(a => a.status === 'active' || a.status === 'pending');
  const [accountId, setAccountId] = useState(defaultAccountId || activeAccounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');

  const selected = accounts.find(a => a.id === accountId);
  const autoProfit = accountId ? (accountProfits[accountId] ?? null) : null;

  // Auto-fill amount when account changes
  useEffect(() => {
    if (accountId && autoProfit !== null && autoProfit > 0) {
      setAmount(fmt2(autoProfit));
    } else {
      setAmount('');
    }
  }, [accountId]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      const id = defaultAccountId || activeAccounts[0]?.id || '';
      setAccountId(id);
      setDate(today());
      setNote('');
      const profit = id ? (accountProfits[id] ?? null) : null;
      setAmount(profit !== null && profit > 0 ? fmt2(profit) : '');
    }
  }, [open]);

  const handleAccountChange = (id: string) => {
    setAccountId(id);
    const profit = accountProfits[id] ?? null;
    if (profit !== null && profit > 0) setAmount(fmt2(profit));
    else setAmount('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n <= 0 || !accountId) return;
    onSubmit(accountId, n, date, note);
    setAmount('');
    setDate(today());
    setNote('');
    onOpenChange(false);
  };

  const curr = selected?.currency === 'EUR' ? '€' : '$';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            Payout
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Compte</Label>
            <Select value={accountId} onValueChange={handleAccountChange}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Sélectionner un compte" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      {a.name}
                      {a.accountCode && <span className="font-mono text-[10px] text-muted-foreground">{a.accountCode}</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Montant {selected ? `(${selected.currency})` : ''}
              </Label>
              {autoProfit !== null && autoProfit > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(fmt2(autoProfit))}
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                >
                  <Zap className="h-3 w-3" />
                  Profit actuel : {curr}{fmt2(autoProfit)}
                </button>
              )}
            </div>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="font-mono"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Note (optionnel)</Label>
            <Input
              placeholder="Ex: Payout mensuel"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={!amount || parseFloat(amount) <= 0 || !accountId}>
              Confirmer le payout
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutDialog;
