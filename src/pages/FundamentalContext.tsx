import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContextEditor } from '@/components/fundamental/ContextEditor';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { shiftDay } from '@/lib/discipline';
import {
  BLOCK_TITLES, PAIRS, contextDate, currentWeek, weekNumber, type BlockKey, type FundamentalBlocks,
} from '@/lib/fundamentalContext';

const dateLabel = (day: string) => contextDate.format(new Date(`${day}T00:00:00Z`));

export default function FundamentalContext() {
  const { data: appData, mutateData } = useData();
  const [monday, setMonday] = useState(currentWeek);
  const [dirtyBlocks, setDirtyBlocks] = useState<Set<BlockKey>>(() => new Set());
  const data = appData.fundamentalWeeks.find(week => week.weekStart === monday)?.blocks ?? {};

  const setDirty = (block: BlockKey, dirty: boolean) => {
    setDirtyBlocks(current => {
      if (current.has(block) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(block);
      else next.delete(block);
      return next;
    });
  };

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

  const renderBlock = (block: BlockKey, accent = false) => (
    <section key={`${monday}:${block}`} aria-labelledby={`fundamental-${block}`} className={`min-w-0 rounded-xl border p-4 ${accent ? 'border-blue-500/30 bg-blue-500/5' : 'border-border bg-card/30'}`}>
      <h2 id={`fundamental-${block}`} className={`mb-4 text-sm font-semibold ${accent ? 'text-blue-700 dark:text-blue-300' : ''}`}>
        {block === 'week' ? `Semaine ${weekNumber(monday)}` : BLOCK_TITLES[block]}
      </h2>
      <ContextEditor block={block} monday={monday} existing={data} onSave={save} dirty={dirtyBlocks.has(block)} onDirtyChange={dirty => setDirty(block, dirty)} />
    </section>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5 pb-10">
      <h1 className="sr-only page-title-hidden">Contexte fondamental</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" disabled={dirtyBlocks.size > 0} aria-label="Semaine précédente" onClick={() => setMonday(day => shiftDay(day, -7))}><ChevronLeft aria-hidden="true" /></Button>
        <p className="px-1 text-sm font-medium" aria-live="polite">{dateLabel(monday)} – {dateLabel(shiftDay(monday, 6))}</p>
        <Button variant="outline" size="icon" disabled={dirtyBlocks.size > 0} aria-label="Semaine suivante" onClick={() => setMonday(day => shiftDay(day, 7))}><ChevronRight aria-hidden="true" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setMonday(currentWeek())} disabled={dirtyBlocks.size > 0 || monday === currentWeek()}>Cette semaine</Button>
        {dirtyBlocks.size > 0 && <p className="text-xs text-muted-foreground">Enregistre ou annule tes modifications avant de changer de semaine.</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['regime', 'dollar', 'week'] as const).map(block => renderBlock(block))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PAIRS.map(pair => renderBlock(pair, true))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {renderBlock('calendar')}
        {renderBlock('banks')}
      </div>
      {renderBlock('notes')}
    </div>
  );
}
