export type ExitType = 'TP' | 'SL' | 'BE' | 'Manual' | 'Trail';
export type SetupQuality = 1 | 2 | 3;

export interface Trade {
  id: string;
  tradeNumber: number;
  date: string;
  endDate?: string;
  pair: string;
  type: 'Buy' | 'Sell';
  result: number;
  commission: number;
  swap: number;
  exitType: ExitType;
  setupQuality: SetupQuality;
  strategyRespected: boolean;
  riskPercent?: number; // risk taken on this trade, in % of account balance
  screenshot?: string; // legacy single screenshot
  screenshots?: string[]; // multiple images
  notes?: string;
  accountId: string;
}

export type TradeFormData = Omit<Trade, 'id' | 'tradeNumber'>;

// La commission est toujours considérée comme un coût, qu'elle soit
// enregistrée positive ou négative. Le swap conserve son signe réel.
// Exemple : 556 + commission 58 + swap 0 = 498 net.
// Un ancien trade avec commission -58 donne aussi 498 net.
export const getNetResult = (trade: Trade): number => {
  return trade.result - Math.abs(trade.commission || 0) + (trade.swap || 0);
};

// R-multiple: résultat net exprimé comme multiple du montant risqué
export const getTradeR = (trade: Trade, balance: number): number | null => {
  if (!trade.riskPercent || trade.riskPercent <= 0 || !balance) return null;
  const riskAmount = balance * (trade.riskPercent / 100);
  return getNetResult(trade) / riskAmount;
};

export const getTradeScreenshots = (trade: Trade): string[] => {
  const imgs: string[] = [];
  if (trade.screenshots && trade.screenshots.length > 0) return trade.screenshots;
  if (trade.screenshot) return [trade.screenshot];
  return imgs;
};

export const PAIRS = [
  // Majors
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
  // EUR crosses
  'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD',
  'EURSEK', 'EURNOK', 'EURDKK', 'EURTRY', 'EURMXN', 'EURPLN', 'EURHUF', 'EURCZK', 'EURZAR', 'EURSGD', 'EURHKD',
  // GBP crosses
  'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD',
  'GBPSEK', 'GBPNOK', 'GBPTRY', 'GBPPLN', 'GBPZAR', 'GBPSGD',
  // AUD crosses
  'AUDJPY', 'AUDCHF', 'AUDCAD', 'AUDNZD', 'AUDSGD', 'AUDHKD',
  // NZD crosses
  'NZDJPY', 'NZDCHF', 'NZDCAD', 'NZDSGD',
  // CAD / CHF crosses
  'CADJPY', 'CADCHF', 'CHFJPY',
  // USD exotics
  'USDSEK', 'USDDKK', 'USDNOK', 'USDMXN', 'USDTRY',
  'USDSGD', 'USDZAR', 'USDHKD', 'USDPLN', 'USDHUF', 'USDCZK',
  'USDCNH', 'USDINR', 'USDTHB', 'USDMYR',
  // Metals
  'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD',
  // Indices
  'US30', 'NAS100', 'SPX500', 'DAX40', 'FTSE100', 'CAC40', 'NKY225', 'AUS200', 'HK50', 'ES35',
  // Crypto
  'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BNBUSD', 'SOLUSD',
] as const;

export const EXIT_TYPES: ExitType[] = ['TP', 'SL', 'BE', 'Manual', 'Trail'];
