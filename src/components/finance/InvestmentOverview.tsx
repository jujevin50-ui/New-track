import { Donut } from './financeCharts';
import { investmentColor } from './investmentColors';
import { Card, Empty, Stat, eur } from './ui';
import type { investmentAssets } from '@/lib/financeAssets';

type Assets = ReturnType<typeof investmentAssets>;

export default function InvestmentOverview({ assets, lastDate, onSelect }: { assets: Assets; lastDate?: string; onSelect: (id: string) => void }) {
  const current = assets.filter(asset => asset.currentValue > 0).sort((a, b) => b.currentValue - a.currentValue);
  const total = current.reduce((sum, asset) => sum + asset.currentValue, 0);
  return <div className="space-y-8">
    <div className="finance-invest-metrics">
      <Stat label="Valeur des actifs détaillés" value={eur(total)} />
      <Stat label="Actifs en portefeuille" value={String(assets.filter(asset => asset.present).length)} />
      <Stat label="Fiches PDF" value={String(assets.filter(asset => asset.profile?.pdf).length)} />
    </div>
    <Card title="Répartition du portefeuille" action={lastDate && <span className="text-xs text-muted-foreground">{new Date(`${lastDate}T12:00:00`).toLocaleDateString('fr-FR')}</span>}>
      {current.length ? <div className="grid items-center gap-8 md:grid-cols-[minmax(240px,.8fr)_minmax(0,1.2fr)]">
        <div className="h-[260px] min-w-0" role="img" aria-label={`Répartition de ${current.length} actifs, total ${eur(total)}`}><Donut data={current.map(asset => ({name:asset.name,value:asset.currentValue}))} colors={current.map(asset=>investmentColor(asset.id))} centerLabel="Actifs détaillés" /></div>
        <div className="max-h-[300px] space-y-2 overflow-y-auto">{current.map(asset=><button type="button" key={asset.id} onClick={()=>onSelect(asset.id)} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left transition-colors hover:bg-secondary/60">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{background:investmentColor(asset.id)}} /><span className="min-w-0 flex-1 text-sm font-medium">{asset.name}</span><span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums">{eur(asset.currentValue)}</span><span className="mt-1 block text-xs tabular-nums text-muted-foreground">{(asset.currentValue/total*100).toLocaleString('fr-FR',{maximumFractionDigits:1})} %</span></span>
        </button>)}</div>
      </div> : <Empty text="Ajoute un relevé détaillé pour voir la répartition de tes actifs." />}
    </Card>
  </div>;
}
