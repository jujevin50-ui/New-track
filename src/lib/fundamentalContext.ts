import type { Screenshot } from '@/types/note';
import { shiftDay } from '@/lib/discipline';

export const BANKS = ['Fed', 'BCE', 'BoE', 'RBA'] as const;

type Pair = 'EURUSD' | 'GBPUSD' | 'AUDUSD';
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

interface PairContext {
  bias: '' | 'Haussier' | 'Baissier' | 'Neutre';
  differential: string;
  driver: string;
}

export type FundamentalBlocks = {
  regime: { regime: '' | 'Risk-on' | 'Risk-off'; vix: string };
  dollar: { dxy: string; us10y: string; fedBias: string };
  week: { events: string };
  calendar: EconomicCalendar | EconomicEvent[];
  banks: Partial<Record<Bank, BankContext>>;
  notes: { text: string };
};

export type BlockKey = keyof FundamentalBlocks;
export type EditableBlockKey = Exclude<BlockKey, 'calendar'>;
export type WeekContext = Partial<FundamentalBlocks & Record<Pair, PairContext>>;

export interface FundamentalWeek {
  weekStart: string;
  blocks: WeekContext;
}

export const BLOCK_TITLES: Record<BlockKey, string> = {
  regime: 'Régime de marché',
  dollar: 'Dollar',
  week: 'Semaine',
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
