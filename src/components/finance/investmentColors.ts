import { PALETTE } from './financeCharts';

export function investmentColor(id: string) {
  const hash = [...id].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 0);
  return PALETTE[hash % PALETTE.length];
}

