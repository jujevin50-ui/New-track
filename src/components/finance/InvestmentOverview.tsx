import { FileText, Layers, PieChart } from 'lucide-react';
import { Donut } from './financeCharts';
import { investmentColor } from './investmentColors';
import { eur } from './ui';
import type { investmentAssets } from '@/lib/financeAssets';

type Assets = ReturnType<typeof investmentAssets>;

export default function InvestmentOverview({ assets, lastDate, onSelect }: { assets: Assets; lastDate?: string; onSelect: (id: string) => void }) {
  const current = assets.filter(asset => asset.currentValue > 0).sort((a, b) => b.currentValue - a.currentValue);
  const total = current.reduce((sum, asset) => sum + asset.currentValue, 0);
  return <div className="grid items-stretch gap-4 xl:grid-cols-[0.8fr_1.2fr]">
    <section className="app-panel surface flex flex-col justify-between gap-6 p-6 sm:p-7">
      <div><p className="text-xs font-medium text-muted-foreground">Valeur des actifs détaillés</p><p className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{eur(total)}</p><p className="mt-2 text-xs text-muted-foreground">D’après les derniers relevés de chaque compte</p></div>
      <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-5"><div><span className="mb-2 inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400"><Layers className="h-4 w-4" /></span><p className="text-lg font-semibold">{assets.filter(asset => asset.present).length}</p><p className="text-xs text-muted-foreground">Actifs présents</p></div><div><span className="mb-2 inline-flex rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400"><FileText className="h-4 w-4" /></span><p className="text-lg font-semibold">{assets.filter(asset => asset.profile?.pdf).length}</p><p className="text-xs text-muted-foreground">Fiches PDF</p></div></div>
      <p className="text-[11px] text-muted-foreground">{lastDate ? `Dernier relevé enregistré le ${new Date(`${lastDate}T12:00:00`).toLocaleDateString('fr-FR')}` : 'Ajoute un relevé pour commencer ton suivi.'}</p>
    </section>
    <section className="app-panel surface min-w-0 p-5 sm:p-6" aria-label="Répartition du portefeuille">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><PieChart className="h-4 w-4 text-primary" />Répartition des actifs</h2>
      {current.length ? <div className="mt-3 grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="h-[220px] min-w-0" role="img" aria-label={`Camembert de répartition de ${current.length} actifs, total ${eur(total)}`}><Donut data={current.map(asset => ({ name: asset.name, value: asset.currentValue }))} colors={current.map(asset => investmentColor(asset.id))} centerLabel="Répartition" /></div><div className="max-h-[240px] space-y-1 overflow-y-auto">{current.map(asset => <button type="button" key={asset.id} onClick={() => onSelect(asset.id)} className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-secondary/60"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: investmentColor(asset.id) }} /><span className="min-w-0 flex-1 truncate text-xs font-medium">{asset.name}</span><span className="shrink-0 text-right"><span className="block text-xs font-semibold">{(asset.currentValue / total * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</span><span className="block text-[10px] text-muted-foreground">{eur(asset.currentValue)}</span></span></button>)}</div></div> : <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground"><PieChart className="h-9 w-9 opacity-30" /><p>La répartition apparaîtra avec tes premiers actifs valorisés.</p></div>}
    </section>
  </div>;
}
