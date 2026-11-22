import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Clipboard, DollarSign, Pencil } from 'lucide-react';
import { ContextEditor } from '@/components/fundamental/ContextEditor';
import { InstrumentAnalysisEditor } from '@/components/fundamental/InstrumentAnalysisEditor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/contexts/DataContext';
import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';
import { queueBackgroundSave } from '@/lib/backgroundSaves';
import type { Screenshot } from '@/types/note';
import { pastedImage, readClipboardImage, readScreenshot } from '@/lib/screenshots';
import { shiftDay } from '@/lib/discipline';
import {
  ANALYSIS_INSTRUMENTS, BANKS, BLOCK_TITLES, contextDate, currentWeek, fillBankContext, isAnalysisInstrument,
  readCalendar, weekNumber, type BlockKey, type FundamentalBlocks, type WeekContext,
} from '@/lib/fundamentalContext';

type PageEditKey = Exclude<BlockKey, 'calendar'>;
const dateLabel = (day: string) => day ? contextDate.format(new Date(`${day}T00:00:00Z`)) : '—';
const addUnit = (value: string | undefined, unit: string) => value ? `${value} ${unit}` : undefined;

const baseCurrencyFlags = {
  EURUSD: 'eu',
  GBPUSD: 'gb',
  AUDUSD: 'au',
} as const;

function Block({ block, children, onEdit, editing, editor, action }: {
  block: BlockKey; children: ReactNode; onEdit: (block: PageEditKey) => void;
  editing: PageEditKey | null; editor: ReactNode; action?: ReactNode;
}) {
  const isEditing = editing === block;
  const analysisBlock = isAnalysisInstrument(block);
  const Heading = analysisBlock ? 'h3' : 'h2';
  const dollarIndex = block === 'DXY';
  const frame = dollarIndex ? 'border-profit/50 bg-profit/10' : analysisBlock ? 'border-primary/40 bg-primary/5' : 'border-border bg-card/30';
  const titleColor = dollarIndex ? 'text-profit' : analysisBlock ? 'text-primary' : '';
  return (
    <section aria-labelledby={`fundamental-${block}`} className={`min-w-0 rounded-xl border p-4 2xl:p-6 ${frame}`}>
      <header className="mb-4 flex min-w-0 items-center justify-between gap-2">
        <Heading id={`fundamental-${block}`} className={`flex min-w-0 items-center gap-2 break-words text-sm font-semibold 2xl:text-base ${titleColor}`}>
          {analysisBlock && (dollarIndex ? (
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-profit/40 bg-profit/15" aria-hidden="true">
              <DollarSign className="size-4" />
            </span>
          ) : (
            <span className="flex shrink-0 items-center -space-x-1.5" aria-hidden="true">
              {[baseCurrencyFlags[block], 'us'].map(flag => (
                <img key={flag} src={`/icons/currencies/${flag}.svg`} alt="" className="size-6 rounded-full border border-background object-cover" />
              ))}
            </span>
          ))}
          {BLOCK_TITLES[block]}
        </Heading>
        {action ?? (!isEditing && block !== 'calendar' && <Button
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
        </Button>)}
      </header>
      {isEditing ? editor : children}
    </section>
  );
}

type Detail = [label: string, value: string | undefined, numeric?: true];

function Details({ fields, empty = 'À renseigner' }: { fields: Detail[]; empty?: string }) {
  if (!fields.some(([, value]) => value)) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <dl className="space-y-2 text-sm 2xl:text-base">
      {fields.map(([label, value, numeric]) => (
        <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3">
          <dt className="break-words text-muted-foreground">{label}</dt>
          <dd className="whitespace-pre-wrap break-words text-right">
            {numeric && value ? (
              <span className="inline-block max-w-full rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium tabular-nums text-primary">{value}</span>
            ) : value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TextBlock({ value, empty }: { value?: string; empty: string }) {
  return <p className={`whitespace-pre-wrap break-words text-sm 2xl:text-base ${value ? '' : 'text-muted-foreground'}`}>{value || empty}</p>;
}

function CapturePreview({ screenshot, title, label = `Agrandir la capture · ${title}`, compact = false }: {
  screenshot: Screenshot; title: string; label?: string; compact?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={label} className="w-full rounded border border-border bg-muted/20">
          <img src={screenshot.content} alt="" loading="lazy" className={`mx-auto block max-w-full rounded object-contain ${compact ? 'max-h-56 2xl:max-h-72' : 'max-h-80 2xl:max-h-[clamp(20rem,32vh,28rem)]'}`} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl min-[1920px]:max-w-[1600px]">
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Aperçu de la capture d’écran</DialogDescription>
        </DialogHeader>
        <img src={screenshot.content} alt={screenshot.name} className="mx-auto max-h-[76dvh] max-w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
}

export default function FundamentalContext() {
  const { data: appData, mutateData } = useData();
  const [monday, setMonday] = useState(currentWeek);
  const [editing, setEditing] = useState<PageEditKey | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteError, setPasteError] = useState('');
  const { saved: pasteAccepted, confirm: confirmPaste } = useSaveConfirmation();
  const [pending, setPending] = useState(() => new Map<string, { block: BlockKey; content: FundamentalBlocks[BlockKey] }>());

  const weekData = (weekStart: string) => {
    let data: WeekContext = appData.fundamentalWeeks.find(week => week.weekStart === weekStart)?.blocks ?? {};
    for (const [key, edit] of pending) {
      if (key.startsWith(`${weekStart}:`)) data = { ...data, [edit.block]: edit.content };
    }
    return data;
  };

  const save = (
    block: BlockKey,
    change: FundamentalBlocks[BlockKey] | ((existing: WeekContext) => FundamentalBlocks[BlockKey]),
    weekStart = monday,
  ) => {
    const key = `${weekStart}:${block}`;
    const contentFor = (existing: WeekContext) => typeof change === 'function' ? change(existing) : change;
    const edit = { block, content: contentFor(weekData(weekStart)) };
    setPending(current => new Map(current).set(key, edit));
    const clear = () => {
      setPending(current => {
        if (current.get(key) !== edit) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    };

    queueBackgroundSave(async () => {
      await mutateData(current => {
        const existing = current.fundamentalWeeks.find(week => week.weekStart === weekStart);
        const blocks = existing?.blocks ?? {};
        const week = { weekStart, blocks: { ...blocks, [block]: contentFor(blocks) } };
        return {
          ...current,
          fundamentalWeeks: existing
            ? current.fundamentalWeeks.map(entry => entry.weekStart === weekStart ? week : entry)
            : [...current.fundamentalWeeks, week],
        };
      });
      clear();
    }, `Impossible d’enregistrer le bloc « ${BLOCK_TITLES[block]} ».`, clear);
  };

  const data = weekData(monday);
  const calendar = readCalendar(data.calendar);

  const pasteCalendar = async (getFile: () => Promise<File>) => {
    if (pasting || pasteAccepted || editing !== null) return;
    setPasting(true);
    setPasteError('');
    try {
      const screenshot = await readScreenshot(await getFile());
      confirmPaste();
      save('calendar', { ...calendar, screenshot });
    } catch (cause) {
      setPasteError(cause instanceof Error ? cause.message : 'Impossible de coller l’image.');
    } finally {
      setPasting(false);
    }
  };

  const banks = data.banks ?? {};
  const nextMonday = shiftDay(monday, 7);
  const nextBanks = weekData(nextMonday).banks ?? {};
  const blockProps = {
    onEdit: (block: PageEditKey) => { if (!pasting) setEditing(block); },
    editing,
    editor: editing && (isAnalysisInstrument(editing) ? <InstrumentAnalysisEditor
      key={editing}
      instrument={editing}
      analysis={data[editing]}
      onSave={analysis => save(editing, existing => ({ ...existing[editing], ...analysis }))}
      onClose={() => setEditing(null)}
    /> : <ContextEditor
      block={editing}
      existing={data}
      onSave={save}
      onClose={() => setEditing(null)}
      bankReport={editing === 'banks' ? {
        canCopy: draft => fillBankContext(draft, nextBanks) !== nextBanks,
        copy: draft => save('banks', existing => fillBankContext(draft, existing.banks ?? {}), nextMonday),
        openNextWeek: () => {
          setEditing(null);
          setPasteError('');
          setMonday(nextMonday);
        },
      } : undefined}
    />),
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5 pb-10 2xl:max-w-[1720px] 2xl:space-y-6 min-[1920px]:max-w-[1920px]">
      <h1 className="sr-only page-title-hidden">Contexte fondamental</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" disabled={editing !== null || pasting} aria-label="Semaine précédente" onClick={() => { setPasteError(''); setMonday(day => shiftDay(day, -7)); }}><ChevronLeft aria-hidden="true" /></Button>
        <p className="px-1 text-sm font-medium" aria-live="polite">{dateLabel(monday)} – {dateLabel(shiftDay(monday, 6))}</p>
        <Button variant="outline" size="icon" disabled={editing !== null || pasting} aria-label="Semaine suivante" onClick={() => { setPasteError(''); setMonday(day => shiftDay(day, 7)); }}><ChevronRight aria-hidden="true" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { setPasteError(''); setMonday(currentWeek()); }} disabled={editing !== null || pasting || monday === currentWeek()}>Cette semaine</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 2xl:gap-6">
        <Block block="regime" {...blockProps}><Details fields={[[ 'Régime', data.regime?.regime ], [ 'VIX', data.regime?.vix, true ]]} /></Block>
        <Block block="dollar" {...blockProps}><Details fields={[[ 'DXY', data.dollar?.dxy, true ], [ 'US10Y', addUnit(data.dollar?.us10y, '%'), true ], [ 'Biais Fed', data.dollar?.fedBias ]]} /></Block>
        <Block block="week" {...blockProps}>
          <p className="mb-2 text-sm font-medium">Semaine {weekNumber(monday)}</p>
          <TextBlock value={data.week?.events} empty="Aucun événement majeur renseigné." />
        </Block>
      </div>
      <section aria-labelledby="fundamental-analysis-heading" className="space-y-3">
        <h2 id="fundamental-analysis-heading" className="text-sm font-semibold 2xl:text-base">Analyse des marchés</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 2xl:gap-6">
          {ANALYSIS_INSTRUMENTS.map(instrument => {
            const analysis = data[instrument];
            return (
              <Block key={instrument} block={instrument} {...blockProps}>
                <div className="space-y-3">
                  {analysis?.bias && (
                    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
                      analysis.bias === 'Haussier' ? 'border-profit/40 bg-profit/10 text-profit'
                        : analysis.bias === 'Baissier' ? 'border-loss/40 bg-loss/10 text-loss'
                        : 'border-border text-muted-foreground'
                    }`}>{analysis.bias}</span>
                  )}
                  {(analysis?.note || (!analysis?.screenshot && !analysis?.bias)) && <TextBlock value={analysis?.note} empty="Aucune analyse renseignée cette semaine." />}
                  {analysis?.screenshot && <CapturePreview screenshot={analysis.screenshot} title={`Analyse ${instrument}`} compact />}
                </div>
              </Block>
            );
          })}
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] 2xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] 2xl:gap-6">
        <Block block="calendar" {...blockProps} action={
          <Button type="button" variant="outline" size="sm" loading={pasting} saved={pasteAccepted} disabled={editing !== null || pasteAccepted}
            onClick={() => void pasteCalendar(() => readClipboardImage('calendrier'))}
            onPaste={event => {
              const file = pastedImage(event.clipboardData);
              if (!file) return;
              event.preventDefault();
              void pasteCalendar(async () => file);
            }}>
            {!pasteAccepted && <Clipboard aria-hidden="true" />}{pasteAccepted ? 'Pris en compte' : 'Coller l’image'}
          </Button>
        }>
          {pasteError && <p role="alert" className="mb-3 text-sm text-destructive">{pasteError}</p>}
          {calendar.screenshot && <CapturePreview screenshot={calendar.screenshot} title="Calendrier économique de la semaine" label="Agrandir la capture du calendrier" />}
        </Block>
        <Block block="banks" {...blockProps}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:gap-6">
            {BANKS.map(bank => <div key={bank} className="min-w-0">
              <h3 className="mb-2 text-sm font-medium 2xl:text-base">{bank}</h3>
              <Details fields={[
                ['Taux', addUnit(banks[bank]?.rate, '%'), true],
                ['Prochaine réunion', banks[bank]?.meeting ? dateLabel(banks[bank].meeting) : undefined],
                ['Biais', banks[bank]?.tone],
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
