import { useState } from 'react';
import { Check, X } from 'lucide-react';
import DashboardFilter from './DashboardFilter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isTradingDay } from '@/lib/discipline';
import type { DailyJournal } from '@/hooks/useDailyJournal';
import type { DashboardDay } from '@/lib/dashboardAnalytics';

export default function CalendarJournalList({ journals,daily,month,today,selectedDate,onSelectDate,currency }: {
  journals:DailyJournal[];daily:DashboardDay[];month:string;today:string;selectedDate:string;onSelectDate:(day:string)=>void;currency:string;
}) {
  const [query,setQuery]=useState('');
  const [period,setPeriod]=useState('all');
  const [status,setStatus]=useState('saved');
  const [limit,setLimit]=useState(24);
  const journalMap=new Map(journals.map(journal=>[journal.date,journal]));
  const results=new Map(daily.map(day=>[day.date,day]));
  const text=query.trim().toLocaleLowerCase('fr-FR');
  const dates=[...new Set([...journalMap.keys(),...results.keys()])].filter(day=>day<=today&&isTradingDay(day))
    .filter(day=>period==='all'||day.startsWith(month))
    .filter(day=>status==='all'||(status==='saved'?journalMap.has(day):!journalMap.has(day)))
    .filter(day=>{const journal=journalMap.get(day);return !text||[day,journal?.notes,journal?.lessonsLearned,journal?.goals,...(journal?.mistakes??[])].some(value=>value?.toLocaleLowerCase('fr-FR').includes(text));})
    .sort((a,b)=>b.localeCompare(a));
  const money=(value:number)=>{try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency,signDisplay:'exceptZero',maximumFractionDigits:2}).format(value);}catch{return value.toLocaleString('fr-FR');}};
  return <div className="min-w-0 space-y-5">
    <div className="calendar-list-filters dashboard-filter-controls">
      <DashboardFilter label="Période" ariaLabel="Période de la liste des bilans" value={period} onChange={value=>{setPeriod(value);setLimit(24);}} options={[{value:'all',label:'Tout l’historique'},{value:'month',label:new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}]} />
      <DashboardFilter label="Bilans" ariaLabel="État des bilans journaliers" value={status} onChange={value=>{setStatus(value);setLimit(24);}} options={[{value:'saved',label:'Enregistrés'},{value:'all',label:'Toutes les journées'},{value:'missing',label:'À rédiger'}]} />
      <div className="min-w-0 flex-1 basis-full"><label htmlFor="calendar-notes-search" className="dashboard-filter-caption">Recherche dans les notes</label><Input id="calendar-notes-search" type="search" placeholder="Date, note, point à retenir…" value={query} onChange={event=>{setQuery(event.target.value);setLimit(24);}} /></div>
    </div>
    <p className="text-xs text-muted-foreground" aria-live="polite">{dates.length} bilan{dates.length>1?'s':''}{status==='missing'?' à rédiger':''}</p>
    <div className="calendar-journal-list" role="list" aria-label="Bilans journaliers et notes">{dates.slice(0,limit).map(day=>{
      const journal=journalMap.get(day),result=results.get(day);
      const hasNotes=Boolean(journal?.notes||journal?.lessonsLearned||journal?.goals||journal?.mistakes?.length);
      return <div role="listitem" key={day}><button type="button" className="calendar-journal-row" aria-label={`Consulter le bilan du ${day}`} aria-pressed={selectedDate===day} onClick={()=>onSelectDate(day)}>
        <span className="flex items-start justify-between gap-4"><span className="min-w-0"><span className="block text-sm font-semibold capitalize">{new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</span><span className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">{journal?<>{journal.strategyRespected?<Check className="h-3.5 w-3.5 text-profit" aria-hidden="true"/>:<X className="h-3.5 w-3.5 text-loss" aria-hidden="true"/>}{journal.strategyRespected?'Stratégie respectée':'Hors stratégie'}</>:'Bilan à rédiger'}</span></span>
          <span className="shrink-0 text-right"><span className={`block text-sm font-semibold tabular-nums ${result?.net?result.net>0?'text-profit':'text-loss':''}`}>{result?money(result.net):'—'}</span><span className="mt-1.5 block text-xs text-muted-foreground">{result?.trades??0} trade{(result?.trades??0)>1?'s':''}</span></span>
        </span>
        {journal?.notes&&<span className="mt-4 block whitespace-pre-wrap break-words text-sm leading-relaxed">{journal.notes}</span>}
        {journal?.lessonsLearned&&<span className="mt-3 block whitespace-pre-wrap break-words text-xs leading-relaxed"><span className="font-medium text-muted-foreground">À retenir · </span>{journal.lessonsLearned}</span>}
        {journal?.goals&&<span className="mt-3 block whitespace-pre-wrap break-words text-xs leading-relaxed"><span className="font-medium text-muted-foreground">Prochaine séance · </span>{journal.goals}</span>}
        {journal?.mistakes?.length>0&&<span className="mt-3 block whitespace-pre-wrap break-words text-xs leading-relaxed"><span className="font-medium text-muted-foreground">Erreurs · </span>{journal.mistakes.join(' · ')}</span>}
        {!hasNotes&&<span className="mt-4 block text-xs text-muted-foreground">Aucune note enregistrée.</span>}
      </button></div>;
    })}{!dates.length&&<p className="py-12 text-center text-sm text-muted-foreground">Aucun bilan ne correspond à ces filtres.</p>}</div>
    {dates.length>limit&&<Button variant="ghost" className="w-full" onClick={()=>setLimit(value=>value+24)}>Voir plus ({dates.length-limit})</Button>}
  </div>;
}
