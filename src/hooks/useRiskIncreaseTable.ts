import { useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

export interface RiskIncreaseRule {
  id: string;
  condition: string;
  risk: string;
}

const DEFAULT_RULES: RiskIncreaseRule[] = [
  { id: 'inc-default-1', condition: '0%',  risk: '1%'   },
  { id: 'inc-default-2', condition: '3%',  risk: '1.25%' },
  { id: 'inc-default-3', condition: '5%',  risk: '1.5%' },
  { id: 'inc-default-4', condition: '10%', risk: '2%'   },
];

export const useRiskIncreaseTable = () => {
  const { data, saveTable } = useData();

  const rules: RiskIncreaseRule[] = useMemo(() => {
    const raw = data.riskIncreaseRules as any[] || [];
    if (raw.length === 0) return DEFAULT_RULES;
    return raw.map((r: any) => ({
      id: r.id,
      condition: String(r.condition ?? r.profitPct ?? ''),
      risk: String(r.risk ?? r.riskPct ?? ''),
    }));
  }, [data.riskIncreaseRules]);

  const persist = useCallback(async (newRules: RiskIncreaseRule[]) => {
    await saveTable('riskIncreaseRules', newRules);
  }, [saveTable]);

  const addRule = useCallback(async (condition: string, risk: string) => {
    await persist([...rules, { id: crypto.randomUUID(), condition, risk }]);
  }, [rules, persist]);

  const updateRule = useCallback(async (id: string, condition: string, risk: string) => {
    await persist(rules.map(r => r.id === id ? { ...r, condition, risk } : r));
  }, [rules, persist]);

  const deleteRule = useCallback(async (id: string) => {
    await persist(rules.filter(r => r.id !== id));
  }, [rules, persist]);

  const replaceAll = useCallback(async (newRules: RiskIncreaseRule[]) => {
    await persist(newRules);
  }, [persist]);

  return { rules, addRule, updateRule, deleteRule, replaceAll };
};
