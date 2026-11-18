import { describe, expect, it } from 'vitest';
import { pendingReportTypes } from './usePeriodReports';

describe('report reminders', () => {
  const empty = { weekly: new Set<string>(), monthly: new Set<string>(), yearly: new Set<string>() };

  it('waits until a period with a closed trade has ended', () => {
    const trades = [{ endDate: '2026-11-12T15:00:00Z' }, {}, { endDate: '2025-invalid' }];
    expect(pendingReportTypes(trades, empty, '2026-11-15')).toEqual([]);
    expect(pendingReportTypes(trades, empty, '2026-11-16')).toEqual(['weekly']);
    expect(pendingReportTypes(trades, empty, '2026-12-01')).toEqual(['weekly', 'monthly']);
    expect(pendingReportTypes(trades, empty, '2027-01-01')).toEqual(['weekly', 'monthly', 'yearly']);
  });

  it('keeps only unsaved types, using the closing date across the ISO year boundary', () => {
    const trades = [{ endDate: '2025-12-31' }, { endDate: '2026-12-31' }];
    const saved = { weekly: new Set(['2026-W01']), monthly: new Set(['2025-12']), yearly: new Set(['2025']) };
    expect(pendingReportTypes(trades, saved, '2026-01-05')).toEqual([]);
    expect(pendingReportTypes(trades, { ...saved, yearly: empty.yearly }, '2026-01-05')).toEqual(['yearly']);
  });
});
