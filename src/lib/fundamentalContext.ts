import type { Screenshot } from '@/types/note';
import { shiftDay } from '@/lib/discipline';

export const PAIRS = ['EURUSD', 'GBPUSD', 'AUDUSD'] as const;
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD'] as const;
export const BANKS = ['Fed', 'BCE', 'BoE', 'RBA'] as const;

export type Pair = typeof PAIRS[number];
export type Currency = typeof CURRENCIES[number];
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

export interface BankContext {
  rate: string;
  meeting: string;
  tone: string;
}

export interface PairContext {
  bias: '' | 'Haussier' | 'Baissier' | 'Neutre';
  differential: string;
  driver: string;
}

export type FundamentalBlocks = Record<Pair, PairContext> & {
  regime: { regime: '' | 'Risk-on' | 'Risk-off'; vix: string };
  dollar: { dxy: string; us10y: string; fedBias: string };
  week: { events: string };
  calendar: EconomicEvent[];
  banks: Partial<Record<Bank, BankContext>>;
  notes: { text: string };
};

export type BlockKey = keyof FundamentalBlocks;
export type WeekContext = Partial<FundamentalBlocks>;

export interface FundamentalWeek {
  weekStart: string;
  blocks: WeekContext;
}

export const BLOCK_TITLES: Record<BlockKey, string> = {
  regime: 'Régime de marché',
  dollar: 'Dollar',
  week: 'Semaine',
  EURUSD: 'EURUSD',
  GBPUSD: 'GBPUSD',
  AUDUSD: 'AUDUSD',
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

export function calendarForWeek(events: EconomicEvent[], monday: string) {
  const sunday = shiftDay(monday, 6);
  return events.filter(event => CURRENCIES.includes(event.currency) && event.date >= monday && event.date <= sunday)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}
