import { Trade } from '@/types/trade';
import { Account } from '@/types/account';

// Column name aliases — exact Supabase snake_case + camelCase + common variants (incl. French / Notion exports)
const ALIASES: Record<string, string[]> = {
  id:                ['id', 'trade_id', 'tradeid'],
  tradeNumber:       ['trade_number', 'tradenumber', 'number', '#', 'no'],
  date:              ['date', 'trade_date', 'tradedate', 'open_date', 'opendate', 'date_ouverture', 'jour'],
  endDate:           ['end_date', 'enddate', 'close_date', 'closedate', 'date_cloture', 'date_fin'],
  pair:              ['pair', 'symbol', 'instrument', 'asset', 'paire', 'symbole', 'actif'],
  type:              ['type', 'direction', 'side', 'trade_type', 'sens'],
  result:            ['result', 'profit', 'pnl', 'net_result', 'net_profit', 'net', 'gain_loss', 'resultat', 'gain_perte'],
  commission:        ['commission', 'fee', 'fees', 'cost'],
  swap:              ['swap', 'rollover', 'overnight'],
  exitType:          ['exit_type', 'exittype', 'exit', 'close_type', 'closetype', 'sortie', 'type_sortie'],
  setupQuality:      ['setup_quality', 'setupquality', 'quality', 'setup', 'grade', 'qualite', 'qualite_setup', 'note'],
  strategyRespected: ['strategy_respected', 'strategyrespected', 'strategy', 'respected', 'rule_followed', 'strategie_respectee', 'regles_respectees'],
  screenshots:       ['screenshots', 'screenshot', 'images', 'image'],
  notes:             ['notes', 'note_perso', 'comment', 'comments', 'remarks', 'description', 'remarque', 'remarques', 'commentaire', 'commentaires', 'observations'],
  accountId:         ['account_id', 'accountid', 'account', 'compte', 'nom_compte'],
};

function normalise(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_\-]/g, '');
}

// ── Date parsing ─────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  jan: '01', january: '01', janvier: '01',
  feb: '02', february: '02', fevrier: '02',
  mar: '03', march: '03', mars: '03',
  apr: '04', april: '04', avril: '04',
  may: '05', mai: '05',
  jun: '06', june: '06', juin: '06',
  jul: '07', july: '07', juillet: '07',
  aug: '08', august: '08', aout: '08',
  sep: '09', sept: '09', september: '09', septembre: '09',
  oct: '10', october: '10', octobre: '10',
  nov: '11', november: '11', novembre: '11',
  dec: '12', december: '12', decembre: '12',
};

// Normalise a date string to YYYY-MM-DD. Handles ISO datetimes, DD/MM/YYYY,
// and Notion-style "March 15, 2024" / "15 mars 2024".
export function normaliseDate(raw: string): string {
  if (!raw) return '';
  const date = raw.trim().split('T')[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

  const dmatch = date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmatch) return `${dmatch[3]}-${dmatch[2].padStart(2, '0')}-${dmatch[1].padStart(2, '0')}`;

  const norm = date.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/,/g, '');

  let m = norm.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})$/); // Month DD YYYY
  if (m && MONTH_NAMES[m[1]]) return `${m[3]}-${MONTH_NAMES[m[1]]}-${m[2].padStart(2, '0')}`;

  m = norm.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/); // DD Month YYYY
  if (m && MONTH_NAMES[m[2]]) return `${m[3]}-${MONTH_NAMES[m[2]]}-${m[1].padStart(2, '0')}`;

  return date;
}

export function detectColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normHeaders = headers.map(h => normalise(h));
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      const idx = normHeaders.indexOf(normalise(alias));
      if (idx !== -1) { mapping[field] = headers[idx]; break; }
    }
  }
  return mapping;
}

function detectSeparator(firstLine: string): string {
  const counts = { ',': 0, '\t': 0, ';': 0 };
  for (const ch of firstLine) {
    if (ch in counts) counts[ch as keyof typeof counts]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === sep && !inQ) { result.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };

  const sep = detectSeparator(lines[0]);
  const headers = parseLine(lines[0], sep);
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseLine(l, sep);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });

  return { headers, rows };
}

function parseBool(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'oui' || s === 'vrai' || s === 'x' || s === '[x]';
}

function parseNum(v: string): number {
  const n = parseFloat(v?.replace(',', '.') || '0');
  return isNaN(n) ? 0 : n;
}

function parseScreenshots(v: string): string[] {
  if (!v || v === '[]' || v === 'null') return [];
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  // single URL
  if (v.startsWith('http')) return [v];
  return [];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  trades: Omit<Trade, 'tradeNumber'>[];
}

export function convertRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  defaultAccountId: string,
  existingIds: Set<string>,
  nextTradeNumber: number,
): ImportResult {
  const trades: Omit<Trade, 'tradeNumber'>[] = [];
  let skipped = 0;

  for (const row of rows) {
    const get = (field: string) => (mapping[field] ? row[mapping[field]] ?? '' : '');

    const id = get('id') || crypto.randomUUID();
    if (existingIds.has(id)) { skipped++; continue; }

    const dateRaw = get('date');
    if (!dateRaw) { skipped++; continue; }

    const date = normaliseDate(dateRaw);

    const typeRaw = get('type').toLowerCase();
    const type = typeRaw.includes('sell') || typeRaw === 's' || typeRaw === 'short' ? 'Sell' : 'Buy';

    const qualityRaw = parseInt(get('setupQuality') || '0');
    const setupQuality = [1, 2, 3].includes(qualityRaw) ? qualityRaw : 1;

    const endDateRaw = get('endDate');
    const endDate = endDateRaw ? normaliseDate(endDateRaw) : undefined;

    trades.push({
      id,
      date,
      endDate: endDate || undefined,
      pair: get('pair') || 'UNKNOWN',
      type,
      result: parseNum(get('result')),
      commission: parseNum(get('commission')),
      swap: parseNum(get('swap')),
      exitType: get('exitType') || 'Manual',
      setupQuality,
      strategyRespected: parseBool(get('strategyRespected')),
      screenshots: parseScreenshots(get('screenshots')),
      notes: get('notes') || '',
      accountId: get('accountId') || defaultAccountId,
    });
  }

  return { imported: trades.length, skipped, trades };
}

// ── Export ────────────────────────────────────────────────────────────────────

const EXPORT_HEADERS = [
  'id', 'trade_number', 'date', 'end_date', 'pair', 'type', 'result', 'commission',
  'swap', 'exit_type', 'setup_quality', 'strategy_respected', 'notes', 'account_id',
] as const;

// Excel (locale FR) attend ";" comme séparateur de colonnes dans un CSV
const EXPORT_SEP = ';';

function escapeCSVField(value: string): string {
  if (new RegExp(`["${EXPORT_SEP}\n]`).test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportTradesToCSV(trades: Trade[]): string {
  // BOM UTF-8 pour que Excel détecte l'encodage et affiche correctement les accents
  const lines = ['﻿' + EXPORT_HEADERS.join(EXPORT_SEP)];

  for (const t of trades) {
    const row: Record<typeof EXPORT_HEADERS[number], string> = {
      id: t.id,
      trade_number: String(t.tradeNumber),
      date: t.date,
      end_date: t.endDate || '',
      pair: t.pair,
      type: t.type,
      result: String(t.result),
      commission: String(t.commission),
      swap: String(t.swap),
      exit_type: t.exitType,
      setup_quality: String(t.setupQuality),
      strategy_respected: t.strategyRespected ? 'true' : 'false',
      notes: t.notes || '',
      account_id: t.accountId,
    };
    lines.push(EXPORT_HEADERS.map(h => escapeCSVField(row[h])).join(EXPORT_SEP));
  }

  return lines.join('\n');
}

// ── Accounts ──────────────────────────────────────────────────────────────────

const ACCOUNT_ALIASES: Record<string, string[]> = {
  id:                 ['id', 'account_id', 'accountid'],
  name:               ['name', 'account_name', 'accountname', 'title', 'nom', 'nom_compte'],
  broker:             ['broker', 'firm', 'platform', 'courtier', 'plateforme'],
  initialBalance:     ['initial_balance', 'initialbalance', 'balance', 'starting_balance', 'capital', 'balance_initiale', 'capital_initial', 'solde_initial'],
  currency:           ['currency', 'ccy', 'cur', 'devise'],
  status:             ['status', 'account_status', 'statut'],
  category:           ['category', 'type', 'account_type', 'categorie'],
  createdAt:          ['created_at', 'createdat', 'creation_date', 'date', 'date_creation', 'cree_le'],
  payoutIntervalDays: ['payout_interval_days', 'payoutintervaldays', 'payout_interval', 'payout', 'intervalle_payout'],
  dailyDrawdownPct:   ['daily_drawdown_pct', 'dailydrawdownpct', 'daily_drawdown', 'daily_dd', 'drawdown_journalier', 'dd_journalier'],
  maxDrawdownPct:     ['max_drawdown_pct', 'maxdrawdownpct', 'max_drawdown', 'max_dd', 'drawdown_max', 'dd_max'],
  riskPct:            ['risk_pct', 'riskpct', 'risk', 'risk_percent', 'risque'],
};

export function detectAccountColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normHeaders = headers.map(h => normalise(h));
  for (const [field, aliases] of Object.entries(ACCOUNT_ALIASES)) {
    for (const alias of aliases) {
      const idx = normHeaders.indexOf(normalise(alias));
      if (idx !== -1) { mapping[field] = headers[idx]; break; }
    }
  }
  return mapping;
}

export function isAccountCSV(headers: string[]): boolean {
  const norm = headers.map(h => normalise(h));
  const markers = [...ACCOUNT_ALIASES.initialBalance, ...ACCOUNT_ALIASES.broker].map(normalise);
  return norm.some(h => markers.includes(h));
}

export interface AccountImportResult {
  imported: number;
  skipped: number;
  accounts: Account[];
}

export function convertAccountRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  existingIds: Set<string>,
): AccountImportResult {
  const accounts: Account[] = [];
  let skipped = 0;

  for (const row of rows) {
    const get = (field: string) => (mapping[field] ? row[mapping[field]] ?? '' : '');

    const name = get('name');
    if (!name) { skipped++; continue; }

    const id = get('id') || crypto.randomUUID();
    if (existingIds.has(id)) { skipped++; continue; }

    const createdRaw = get('createdAt');
    const createdAt = createdRaw ? normaliseDate(createdRaw) : new Date().toISOString().split('T')[0];

    const statusRaw = get('status').toLowerCase();
    const status = (['active', 'terminated', 'pending'] as const).find(s => s === statusRaw) || 'active';

    accounts.push({
      id,
      name,
      broker: get('broker') || '',
      initialBalance: parseNum(get('initialBalance')),
      currency: get('currency') || 'USD',
      createdAt,
      status,
      category: get('category') || '',
      payoutIntervalDays: parseNum(get('payoutIntervalDays')),
      dailyDrawdownPct: parseNum(get('dailyDrawdownPct')),
      maxDrawdownPct: parseNum(get('maxDrawdownPct')),
      riskPct: parseNum(get('riskPct')) || 1,
    });
  }

  return { imported: accounts.length, skipped, accounts };
}
