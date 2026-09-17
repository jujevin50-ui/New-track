import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Upload, CheckCircle2, ChevronDown } from 'lucide-react';
import { parseCSV, detectColumns, convertRows, detectAccountColumns, convertAccountRows, isAccountCSV } from '@/lib/csvImport';
import { useData } from '@/contexts/DataContext';
import { Account } from '@/types/account';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
}

type CsvType = 'trades' | 'accounts';

interface Preview {
  headers: string[];
  mapping: Record<string, string>;
  rowCount: number;
  csvType: CsvType;
}

export const TRADE_FIELD_LABELS: Record<string, string> = {
  id: 'ID', tradeNumber: 'N°', date: 'Date', endDate: 'Date fin', pair: 'Paire',
  type: 'Type', result: 'Résultat', commission: 'Commission', swap: 'Swap',
  exitType: 'Exit', setupQuality: 'Qualité', strategyRespected: 'Stratégie',
  screenshots: 'Screenshots', notes: 'Notes', accountId: 'Compte',
};

export const ACCOUNT_FIELD_LABELS: Record<string, string> = {
  id: 'ID', name: 'Nom', broker: 'Broker', initialBalance: 'Balance init.',
  currency: 'Devise', status: 'Statut', category: 'Catégorie', createdAt: 'Créé le',
  payoutIntervalDays: 'Payout (j)', dailyDrawdownPct: 'DD Jour %',
  maxDrawdownPct: 'DD Max %', riskPct: 'Risque %',
};

export function CsvImportDialog({ open, onOpenChange, accounts }: Props) {
  const { data, saveData } = useData();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [accountId, setAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [result, setResult] = useState<{ imported: number; skipped: number; type: CsvType; newAccounts: number } | null>(null);
  const [error, setError] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Fichier .csv requis'); return; }
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) { setError('CSV vide ou invalide'); return; }

      const csvType: CsvType = isAccountCSV(headers) ? 'accounts' : 'trades';

      if (csvType === 'trades') {
        const mapping = detectColumns(headers);
        const missing = ['date', 'pair', 'result'].filter(f => !mapping[f]);
        if (missing.length) { setError(`Colonnes introuvables : ${missing.join(', ')}`); return; }
        setParsedRows(rows);
        setPreview({ headers, mapping, rowCount: rows.length, csvType });
      } else {
        const mapping = detectAccountColumns(headers);
        if (!mapping.name) { setError('Colonne "name" introuvable'); return; }
        setParsedRows(rows);
        setPreview({ headers, mapping, rowCount: rows.length, csvType });
      }
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      if (preview.csvType === 'trades') {
        const existingIds = new Set((data.trades as any[]).map((t: any) => t.id));
        const maxNum = (data.trades as any[]).reduce((m: number, t: any) => Math.max(m, t.tradeNumber || 0), 0);
        const { imported, skipped, trades } = convertRows(parsedRows, preview.mapping, accountId, existingIds, maxNum + 1);
        const withNumbers = trades.map((t, i) => ({ ...t, tradeNumber: maxNum + 1 + i }));

        // Auto-create accounts referenced by the CSV that don't exist yet
        const existingAccountIds = new Set((data.accounts as any[]).map((a: any) => a.id));
        const missingAccountIds = Array.from(new Set(
          withNumbers.map(t => t.accountId).filter(id => id && !existingAccountIds.has(id))
        ));
        const createdAccounts: Account[] = missingAccountIds.map(id => ({
          id,
          accountCode: '',
          name: `Compte importé ${id.slice(0, 8)}`,
          broker: '',
          initialBalance: 0,
          currency: 'USD',
          createdAt: new Date().toISOString().split('T')[0],
          status: 'active',
          category: '',
          payoutIntervalDays: 0,
          dailyDrawdownPct: 0,
          maxDrawdownPct: 0,
          riskPct: 1,
        }));

        await saveData({
          ...data,
          accounts: [...(data.accounts as any[]), ...createdAccounts],
          trades: [...(data.trades as any[]), ...withNumbers],
        });
        setResult({ imported, skipped, type: 'trades', newAccounts: createdAccounts.length });
      } else {
        const existingIds = new Set((data.accounts as any[]).map((a: any) => a.id));
        const { imported, skipped, accounts: newAccounts } = convertAccountRows(parsedRows, preview.mapping, existingIds);
        await saveData({ ...data, accounts: [...(data.accounts as any[]), ...newAccounts] });
        setResult({ imported, skipped, type: 'accounts', newAccounts: 0 });
      }
      setStep('done');
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\'import');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('upload'); setFileName(''); setPreview(null);
    setResult(null); setError(''); setParsedRows([]);
  };

  const fieldLabels = preview?.csvType === 'accounts' ? ACCOUNT_FIELD_LABELS : TRADE_FIELD_LABELS;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Import CSV
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Déposer votre fichier CSV ici</p>
              <p className="text-xs text-muted-foreground mt-1">ou cliquer pour sélectionner</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Trades ou Comptes · Compatible export Lovable · Détection automatique
            </p>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium">{fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {preview.rowCount} {preview.csvType === 'accounts' ? 'comptes' : 'trades'} détectés
                </p>
              </div>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${preview.csvType === 'accounts' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'}`}>
                {preview.csvType === 'accounts' ? 'Comptes' : 'Trades'}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Colonnes détectées</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                {Object.entries(preview.mapping).map(([field, col]) => (
                  <div key={field} className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="text-muted-foreground shrink-0">{fieldLabels[field] || field}</span>
                    <span className="text-foreground truncate">→ {col}</span>
                  </div>
                ))}
              </div>
            </div>

            {preview.csvType === 'trades' && accounts.length > 0 && !preview.mapping.accountId && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Assigner à un compte</p>
                <div className="relative">
                  <select value={accountId} onChange={e => setAccountId(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 text-xs bg-secondary border border-border rounded-lg appearance-none">
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 h-9 text-xs border border-border rounded-lg hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={handleImport} disabled={busy}
                className="flex-1 h-9 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {busy ? 'Import…' : `Importer ${preview.rowCount} ${preview.csvType === 'accounts' ? 'comptes' : 'trades'}`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="font-semibold">{result.imported} {result.type === 'accounts' ? 'comptes' : 'trades'} importés</p>
              {result.skipped > 0 && <p className="text-xs text-muted-foreground mt-1">{result.skipped} ignorés (déjà présents)</p>}
              {result.newAccounts > 0 && <p className="text-xs text-muted-foreground mt-1">{result.newAccounts} compte{result.newAccounts > 1 ? 's' : ''} créé{result.newAccounts > 1 ? 's' : ''} automatiquement</p>}
            </div>
            <button onClick={() => { reset(); onOpenChange(false); }}
              className="h-9 px-6 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Fermer
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
