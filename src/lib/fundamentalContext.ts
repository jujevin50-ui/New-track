import type { Screenshot } from '@/types/note';
import { shiftDay } from '@/lib/discipline';

export const BANKS = ['Fed', 'BCE', 'BoE', 'RBA'] as const;
export const ANALYSIS_INSTRUMENTS = ['EURUSD', 'GBPUSD', 'AUDUSD', 'DXY'] as const;

export type AnalysisInstrument = typeof ANALYSIS_INSTRUMENTS[number];
type Currency = 'USD' | 'EUR' | 'GBP' | 'AUD';
export type Bank = typeof BANKS[number];

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: Currency;
  event: string;
  forecast: string;
  previous: string;
  actual: string;
  screenshot?: Screenshot;
}

export interface EconomicCalendar {
  events: EconomicEvent[];
  screenshot?: Screenshot;
}

export interface BankContext {
  rate: string;
  meeting: string;
  tone: string;
}

export interface InstrumentAnalysis {
  note?: string;
  screenshot?: Screenshot;
  bias?: '' | 'Haussier' | 'Baissier' | 'Neutre';
  differential?: string;
  driver?: string;
}

export type FundamentalBlocks = Record<AnalysisInstrument, InstrumentAnalysis> & {
  regime: { regime: '' | 'Risk-on' | 'Risk-off'; vix: string };
  dollar: { dxy: string; us10y: string; us2y?: string; fedBias: string };
  week: { events: string };
  bondSpreads: { us10yDe10y: string; us2yDe2y: string; us10yUk10y: string; comment?: string };
  inflation: { usCorePce: string; usCorePceForecast: string; euroCore: string; ukCore: string; ukServices: string; stickiest: string };
  cot: { eurNet: string; gbpNet: string; dxyNet: string; comment: string };
  calendar: EconomicCalendar | EconomicEvent[];
  banks: Partial<Record<Bank, BankContext>>;
  notes: { text?: string; drivers?: string; dataToWatch?: string; primaryScenario?: string; alternativeScenario?: string };
};

export type BlockKey = keyof FundamentalBlocks;
export type EditableBlockKey = Exclude<BlockKey, 'calendar' | AnalysisInstrument>;
export type WeekContext = Partial<FundamentalBlocks>;

export function isAnalysisInstrument(block: BlockKey): block is AnalysisInstrument {
  return ANALYSIS_INSTRUMENTS.some(pair => pair === block);
}

export interface FundamentalWeek {
  weekStart: string;
  blocks: WeekContext;
}

export const BLOCK_TITLES: Record<BlockKey, string> = {
  regime: 'Régime de marché',
  dollar: 'Dollar',
  week: 'Semaine',
  bondSpreads: 'Divergences obligataires',
  inflation: 'Inflation comparative',
  cot: 'COT Report – Positionnement',
  EURUSD: 'EURUSD',
  GBPUSD: 'GBPUSD',
  AUDUSD: 'AUDUSD',
  DXY: 'DXY',
  calendar: 'Calendrier éco',
  banks: 'Banques centrales',
  notes: 'Notes et news clés',
};

const parisDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
export const contextDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function currentWeek() {
  const today = parisDate.format(new Date());
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
  return shiftDay(today, 1 - weekday);
}

export function weekNumber(monday: string) {
  const thursday = new Date(`${shiftDay(monday, 3)}T12:00:00Z`);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil((thursday.getTime() - yearStart) / (7 * 86_400_000));
}

export function readCalendar(value: WeekContext['calendar']): EconomicCalendar {
  return Array.isArray(value) ? { events: value } : value ?? { events: [] };
}

export function fillBankContext(source: FundamentalBlocks['banks'], target: FundamentalBlocks['banks']) {
  let result = target;
  for (const bank of BANKS) {
    const from = source[bank];
    if (!from) continue;
    const to = target[bank];
    const rate = to?.rate?.trim() ? to.rate : from.rate?.trim() ?? '';
    const meeting = to?.meeting || from.meeting || '';
    const tone = to?.tone?.trim() ? to.tone : from.tone?.trim() ?? '';
    if (rate !== (to?.rate ?? '') || meeting !== (to?.meeting ?? '') || tone !== (to?.tone ?? '')) {
      result = { ...result, [bank]: { rate, meeting, tone } };
    }
  }
  return result;
}
