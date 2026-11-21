import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { ContextEditor } from '@/components/fundamental/ContextEditor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/contexts/DataContext';
import type { Screenshot } from '@/types/note';
import { shiftDay } from '@/lib/discipline';
import {
  BANKS, BLOCK_TITLES, PAIRS, calendarForWeek, contextDate, currentWeek,
  readCalendar, weekNumber, type BlockKey, type FundamentalBlocks,
} from '@/lib/fundamentalContext';

const dateLabel = (day: string) => day ? contextDate.format(new Date(`${day}T00:00:00Z`)) : '—';
const addUnit = (value: string | undefined, unit: string) => value ? `${value} ${unit}` : undefined;

function Block({ block, children, onEdit, editing, editor, accent = false }: {
  block: BlockKey; children: ReactNode; onEdit: (block: BlockKey) => void;
  editing: BlockKey | null; editor: ReactNode; accent?: boolean;
}) {
  const isEditing = editing === block;
  return (
    <section aria-labelledby={`fundamental-${block}`} className={`min-w-0 rounded-xl border p-4 ${accent ? 'border-blue-500/30 bg-blue-500/5' : 'border-border bg-card/30'}`}>
      <header className="mb-4 flex min-w-0 items-center justify-between gap-2">
        <h2 id={`fundamental-${block}`} className={`min-w-0 break-words text-sm font-semibold ${accent ? 'text-blue-700 dark:text-blue-300' : ''}`}>{BLOCK_TITLES[block]}</h2>
        {!isEditing && <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground [&_svg]:size-3.5"
          aria-label={`Modifier ${BLOCK_TITLES[block]}`}
          title="Modifier"
          disabled={editing !== null}
          onClick={() => onEdit(block)}
        >
          <Pencil aria-hidden="true" />
        </Button>}
      </header>
      {isEditing ? editor : children}
    </section>
  );
}

function Details({ fields, empty = 'À renseigner' }: { fields: [string, string | undefined][]; empty?: string }) {
  if (!fields.some(([, value]) => value)) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <dl className="space-y-2 text-sm">
      {fields.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="whitespace-pre-wrap break-words text-right">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function TextBlock({ value, empty }: { value?: string; empty: string }) {
  return <p className={`whitespace-pre-wrap break-words text-sm ${value ? '' : 'text-muted-foreground'}`}>{value || empty}</p>;
}

function CapturePreview({ screenshot, title, fullWidth = false }: {
  screenshot: Screenshot; title: string; fullWidth?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Agrandir la capture · ${title}`} className={`rounded border border-border ${fullWidth ? 'w-full bg-muted/20' : ''}`}>
          <img src={screenshot.content} alt="" loading="lazy" className={fullWidth ? 'block h-auto w-full rounded' : 'h-9 w-14 object-contain'} />
        </button>
      </DialogTrigger>
      <DialogContent className={fullWidth ? 'sm:max-w-7xl' : 'sm:max-w-5xl'}>
        <DialogHeader className="pr-8">
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription className="sr-only">Capture du calendrier économique</DialogDescription>
        </DialogHeader>
        <img src={screenshot.content} alt={screenshot.name} className={`mx-auto max-w-full object-contain ${fullWidth ? 'max-h-[76dvh]' : 'max-h-[70vh]'}`} />
      </DialogContent>
    </Dialog>
  );
}

export default function FundamentalContext() {
  const { data: appData, mutateData } = useData();
  const [monday, setMonday] = useState(currentWeek);
  const [editing, setEditing] = useState<BlockKey | null>(null);
  const data = appData.fundamentalWeeks.find(week => week.weekStart === monday)?.blocks ?? {};

  const save = (block: BlockKey, content: FundamentalBlocks[BlockKey]) => mutateData(current => {
    const existing = current.fundamentalWeeks.find(week => week.weekStart === monday);
    const week = { weekStart: monday, blocks: { ...existing?.blocks, [block]: content } };
    return {
      ...current,
      fundamentalWeeks: existing
        ? current.fundamentalWeeks.map(entry => entry.weekStart === monday ? week : entry)
        : [...current.fundamentalWeeks, week],
    };
  });

  const calendar = readCalendar(data.calendar);
  const events = calendarForWeek(calendar.events, monday);
  const banks = data.banks ?? {};
  const blockProps = {
    onEdit: setEditing,
    editing,
    editor: editing && <ContextEditor block={editing} existing={data} monday={monday} onSave={save} onClose={() => setEditing(null)} />,
  };
  const stackCalendarAndBanks = Boolean(calendar.screenshot) || editing === 'calendar' || editing === 'banks';

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5 pb-10">
      <h1 className="sr-only page-title-hidden">Contexte fondamental</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" disabled={editing !== null} aria-label="Semaine précédente" onClick={() => setMonday(day => shiftDay(day, -7))}><ChevronLeft aria-hidden="true" /></Button>
        <p className="px-1 text-sm font-medium" aria-live="polite">{dateLabel(monday)} – {dateLabel(shiftDay(monday, 6))}</p>
        <Button variant="outline" size="icon" disabled={editing !== null} aria-label="Semaine suivante" onClick={() => setMonday(day => shiftDay(day, 7))}><ChevronRight aria-hidden="true" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setMonday(currentWeek())} disabled={editing !== null || monday === currentWeek()}>Cette semaine</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Block block="regime" {...blockProps}><Details fields={[[ 'Régime', data.regime?.regime ], [ 'VIX', data.regime?.vix ]]} /></Block>
        <Block block="dollar" {...blockProps}><Details fields={[[ 'DXY', data.dollar?.dxy ], [ 'US10Y', addUnit(data.dollar?.us10y, '%') ], [ 'Biais Fed', data.dollar?.fedBias ]]} /></Block>
        <Block block="week" {...blockProps}>
          <p className="mb-2 text-sm font-medium">Semaine {weekNumber(monday)}</p>
          <TextBlock value={data.week?.events} empty="Aucun événement majeur renseigné." />
        </Block>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PAIRS.map(pair => <Block key={pair} block={pair} accent {...blockProps}>
          <Details fields={[
            ['Biais', data[pair]?.bias],
            ['Différentiel de taux', addUnit(data[pair]?.differential, 'pt')],
            ['Driver clé', data[pair]?.driver],
          ]} />
        </Block>)}
      </div>
      <div className={`grid grid-cols-1 gap-4 ${stackCalendarAndBanks ? '' : 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'}`}>
        <Block block="calendar" {...blockProps}>
          {calendar.screenshot && (
            <div className={events.length > 0 ? 'mb-4' : undefined}>
              <CapturePreview screenshot={calendar.screenshot} title="Calendrier économique de la semaine" fullWidth />
            </div>
          )}
          {events.length === 0 && !calendar.screenshot && <p className="text-sm text-muted-foreground">Aucun calendrier ni événement renseigné pour cette semaine.</p>}
          {events.length > 0 && (
            <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau du calendrier économique">
              <table className="w-full border-collapse text-left text-xs">
                <caption className="pb-3 text-left text-muted-foreground">Impact fort · heures de Paris</caption>
                <thead>
                  <tr className="border-b border-border">
                    {['Date', 'Heure', 'Devise', 'Événement', 'Prévision', 'Précédent', 'Réel', 'Capture'].map(label => <th scope="col" key={label} className="whitespace-nowrap px-2 py-2 font-medium">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => <tr key={event.id} className="border-b border-border">
                    <td className="whitespace-nowrap px-2 py-3">{dateLabel(event.date)}</td>
                    <td className="px-2 py-3">{event.time}</td>
                    <td className="px-2 py-3 font-medium">{event.currency}</td>
                    <td className="min-w-28 break-words px-2 py-3">{event.event}</td>
                    <td className="px-2 py-3">{event.forecast || '—'}</td>
                    <td className="px-2 py-3">{event.previous || '—'}</td>
                    <td className="px-2 py-3">{event.actual || '—'}</td>
                    <td className="px-2 py-3">
                      {event.screenshot ? <CapturePreview screenshot={event.screenshot} title={event.event} /> : '—'}
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </Block>
        <Block block="banks" {...blockProps}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {BANKS.map(bank => <div key={bank} className="min-w-0">
              <h3 className="mb-2 text-sm font-medium">{bank}</h3>
              <Details fields={[
                ['Taux', addUnit(banks[bank]?.rate, '%')],
                ['Prochaine réunion', banks[bank]?.meeting ? dateLabel(banks[bank].meeting) : undefined],
                ['Ton / biais', banks[bank]?.tone],
              ]} />
            </div>)}
          </div>
        </Block>
      </div>
      <Block block="notes" {...blockProps}>
        <TextBlock value={data.notes?.text} empty="Aucune note pour cette semaine." />
      </Block>
    </div>
  );
}
