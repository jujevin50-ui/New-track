import { useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

export interface RiskRule {
  id: string;
  drawdown: string;
  risk: string;
}

const DEFAULT_RULES: RiskRule[] = [
  { id: 'default-1', drawdown: '0%',  risk: '1%'    },
  { id: 'default-2', drawdown: '3%',  risk: '0.75%' },
  { id: 'default-3', drawdown: '5%',  risk: '0.5%'  },
  { id: 'default-4', drawdown: '8%',  risk: '0.25%' },
];

export const useRiskTable = () => {
  const { data, saveTable } = useData();

  const rules: RiskRule[] = useMemo(() => {
    const raw = data.riskRules as any[] || [];
    if (raw.length === 0) return DEFAULT_RULES;
    return raw.map((r: any) => ({
      id: r.id,
      drawdown: String(r.drawdown ?? r.drawdownPct ?? ''),
      risk: String(r.risk ?? r.riskPct ?? ''),
    }));
  }, [data.riskRules]);

  const persist = useCallback(async (newRules: RiskRule[]) => {
    await saveTable('riskRules', newRules);
  }, [saveTable]);

  const addRule = useCallback(async (drawdown: string, risk: string) => {
    await persist([...rules, { id: crypto.randomUUID(), drawdown, risk }]);
  }, [rules, persist]);

  const updateRule = useCallback(async (id: string, drawdown: string, risk: string) => {
    await persist(rules.map(r => r.id === id ? { ...r, drawdown, risk } : r));
  }, [rules, persist]);

  const deleteRule = useCallback(async (id: string) => {
    await persist(rules.filter(r => r.id !== id));
  }, [rules, persist]);

  // Best-effort numeric matching for Dashboard auto-update (ignores text-only rules)
  const getRiskForDrawdown = useCallback((drawdownPct: number): RiskRule | null => {
    if (rules.length === 0) return null;
    const numeric = rules
      .map(r => ({ r, dd: parseFloat(r.drawdown), riskVal: parseFloat(r.risk) }))
      .filter(x => !isNaN(x.dd) && !isNaN(x.riskVal))
      .sort((a, b) => b.dd - a.dd);
    const match = numeric.find(x => drawdownPct >= x.dd);
    return match ? match.r : (numeric.length > 0 ? numeric[numeric.length - 1].r : rules[0]);
  }, [rules]);

  const replaceAll = useCallback(async (newRules: RiskRule[]) => {
    await persist(newRules);
  }, [persist]);

  return { rules, addRule, updateRule, deleteRule, getRiskForDrawdown, replaceAll };
};
