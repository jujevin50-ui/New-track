import { usePagePreference } from '@/hooks/usePagePreference';
import { Button } from '@/components/ui/button';
import type { PeriodPerformance } from '@/lib/periodPerformance';

const date=(day:string)=>new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
const percent=(value:number|null)=>value===null?'—':`${value>0?'+':''}${value.toLocaleString('fr-FR',{maximumFractionDigits:2})} %`;

export default function PeriodPerformanceList({ rows,kind }: {rows:PeriodPerformance[];kind:'week'|'month'}) {
  const [limit,setLimit]=usePagePreference(`dashboard.${kind}.limit`,8);
  const title=kind==='week'?'Performances par semaine':'Performances par mois';
  return <section className="min-w-0" aria-label={title}>
    <header className="mb-5 flex items-baseline justify-between gap-3"><h2 className="text-sm font-semibold">{title}</h2><span className="text-xs text-muted-foreground">{rows.length} {kind==='week'?'semaine':'mois'}{kind==='week'&&rows.length>1?'s':''}</span></header>
    {rows.length?<><table className="period-performance-table w-full table-fixed text-sm"><caption className="sr-only">{title}, résultats nets rapportés au capital initial des comptes sélectionnés ; RR nets cumulés selon le risque de chaque trade sur son compte</caption>
      <colgroup><col style={{width:'29%'}}/><col style={{width:'22%'}}/><col style={{width:'20%'}}/><col style={{width:'13%'}}/><col style={{width:'16%'}}/></colgroup>
      <thead><tr><th scope="col" className="text-left">Période</th><th scope="col">Perf. nette</th><th scope="col" title="R nets cumulés par rapport au risque initial de chaque trade">RR</th><th scope="col">Trades</th><th scope="col">Win rate</th></tr></thead>
      <tbody>{rows.slice(0,limit).map(row=><tr key={row.start}>
        <th scope="row" className="text-left font-medium">{kind==='week'?<><span className="block">S{String(row.week).padStart(2,'0')} <span className="font-normal text-muted-foreground">· {row.year}</span></span><span className="mt-1 block text-[11px] font-normal text-muted-foreground">{date(row.start)} – {date(row.end)}</span></>:<span className="capitalize">{new Date(`${row.start}T12:00:00`).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</span>}</th>
        <td className={`font-semibold ${row.net>0?'text-profit':row.net<0?'text-loss':''}`}>{percent(row.performance)}</td>
        <td className={`period-rr-cell ${row.rr===null?'text-muted-foreground':row.rr>0?'text-profit':row.rr<0?'text-loss':''}`} title={row.rr===null?`Risque ou capital manquant pour ${row.trades-row.rrTrades} trade(s)`:'RR nets cumulés'}>{row.rr===null?'—':`${row.rr>0?'+':''}${row.rr.toLocaleString('fr-FR',{maximumFractionDigits:2})} R`}</td>
        <td>{row.trades}</td><td>{row.winRate.toLocaleString('fr-FR',{maximumFractionDigits:1})} %</td>
      </tr>)}</tbody>
    </table>{rows.length>limit&&<Button variant="ghost" className="mt-3 w-full text-xs" onClick={()=>setLimit(value=>value+12)}>Voir plus ({rows.length-limit})</Button>}</>:<p className="py-10 text-sm text-muted-foreground">Aucun trade clôturé sur cette période.</p>}
  </section>;
}
