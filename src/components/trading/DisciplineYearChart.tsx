import { chartCurveMotion, chartTooltipMotion, chartLineCursor } from '@/lib/chartMotion';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DailyJournal } from '@/hooks/useDailyJournal';
import { disciplineYear, localDay } from '@/lib/discipline';

export default function DisciplineYearChart({ journals, selectedDate, today, onSelectDate, onPeriodChange, hideSummary = false, period = 'year' }: { onPeriodChange?: (period: 'month' | 'year') => void; hideSummary?: boolean; period?: 'month' | 'year'; journals: DailyJournal[]; selectedDate: string; today: string; onSelectDate: (date: string) => void }) {
  const [month, setMonth] = useState(selectedDate.slice(0, 7));
  const [year, setYear] = useState(Number(selectedDate.slice(0, 4)));
  useEffect(() => { setYear(Number(selectedDate.slice(0, 4))); setMonth(selectedDate.slice(0, 7)); }, [selectedDate]);
  const data = useMemo(() => disciplineYear(journals, period === 'month' ? Number(month.slice(0, 4)) : year, today).filter(day => period === 'year' || day.date.startsWith(month)), [journals, year, today, period, month]);
  const moveMonth = (offset: number) => setMonth(localDay(new Date(Number(month.slice(0,4)), Number(month.slice(5,7)) - 1 + offset, 1)).slice(0,7));
  const periodLabel = period === 'year' ? String(year) : new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
  const recorded = data.filter(day => day.percent !== null);
  const average = recorded.length ? Math.round(recorded.reduce((sum, day) => sum + day.percent!, 0) / recorded.length) : null;
  const monthTicks = data.filter((day,index) => index === 0 || day.date.slice(0,7) !== data[index-1].date.slice(0,7)).map(day => day.date);

  return <section className={`app-panel surface min-w-0 ${hideSummary ? 'py-2' : 'p-5 sm:p-6'}`} aria-labelledby="discipline-year-title">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="discipline-year-title" className="text-base font-semibold">Réussite de la discipline</h2>{!hideSummary && <p className="mt-1 text-xs text-muted-foreground">Règles respectées chaque jour · {data.length} jours</p>}</div>
      <div className="flex flex-wrap items-center gap-3">{onPeriodChange && <div className="dashboard-switch dashboard-switch-small" role="group" aria-label="Période de discipline">{(['month', 'year'] as const).map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => onPeriodChange(value)}>{value === 'month' ? 'Mois' : 'Année'}</button>)}</div>}<Button variant="outline" size="icon" aria-label={period === 'year' ? 'Année précédente' : 'Mois précédent'} onClick={() => period === 'year' ? setYear(value => value - 1) : moveMonth(-1)}><ChevronLeft /></Button><span className="min-w-12 text-center text-sm font-semibold" aria-live="polite">{periodLabel}</span><Button variant="outline" size="icon" aria-label={period === 'year' ? 'Année suivante' : 'Mois suivant'} disabled={period === 'year' ? year >= Number(today.slice(0, 4)) : month >= today.slice(0,7)} onClick={() => period === 'year' ? setYear(value => value + 1) : moveMonth(1)}><ChevronRight /></Button></div>
    </header>
    {!hideSummary && <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-3xl font-semibold tracking-tight">{average === null ? '—' : `${average} %`}</span><span className="text-xs text-muted-foreground">{recorded.length ? `en moyenne · ${recorded.length} journée${recorded.length > 1 ? 's' : ''} enregistrée${recorded.length > 1 ? 's' : ''}` : 'Aucune journée enregistrée sur cette période'}</span></div>}
    <div className="h-[280px] w-full min-w-0" role="img" aria-label={`Pourcentage de règles respectées par jour · ${periodLabel}, ${data.length} jours, ${recorded.length} journées enregistrées${average === null ? '' : `, moyenne ${average} %`}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: -12 }} onClick={event => { if (typeof event?.activeLabel === 'string' && event.activeLabel <= today) onSelectDate(event.activeLabel); }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
          <XAxis dataKey="date" ticks={period === 'year' ? monthTicks : undefined} tickFormatter={date => new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', period === 'year' ? { month: 'short' } : { day: 'numeric' })} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} dy={8} />
          <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={value => `${value} %`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
          <Tooltip {...chartTooltipMotion} cursor={chartLineCursor} filterNull={false} content={({ active, payload, label }) => {
            if (!active || !payload?.length || typeof label !== 'string') return null;
            const percent = payload[0]?.payload?.percent;
            return <div className="rounded-[10px] border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm"><p className="font-medium">{new Date(`${label}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p className="mt-1 text-muted-foreground">{percent === null ? label > today ? 'À venir' : 'Sans suivi' : `${percent} % · ${percent / 20} règles sur 5`}</p></div>;
          }} />
          <Area {...chartCurveMotion} type="linear" dataKey="percent" fill="hsl(var(--muted-foreground))" fillOpacity={0.22} stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 2, fill: 'hsl(var(--foreground))', strokeWidth: 0 }} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    {!hideSummary && <p className="mt-3 text-xs text-muted-foreground">Les journées sans suivi restent vides. Chaque règle validée vaut 20 %.</p>}
  </section>;
}
