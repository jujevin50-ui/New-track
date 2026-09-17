import { useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

export interface AnalysisSynthesis {
  id: string;
  title: string;
  content: string;
  date: string;
  updatedAt: string;
}

export const useAnalysisSynthesis = () => {
  const { data, addRow, updateRow, deleteRow } = useData();

  const syntheses: AnalysisSynthesis[] = useMemo(() =>
    (data.analysisSyntheses as any[] || []).map((s: any) => ({
      id: s.id,
      title: s.title || '',
      content: s.content || '',
      date: s.date || '',
      updatedAt: s.updatedAt || '',
    })).sort((a: any, b: any) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.analysisSyntheses]
  );

  const addSynthesis = useCallback(async (title: string, content: string) => {
    const now = new Date().toISOString();
    const item: AnalysisSynthesis = {
      id: crypto.randomUUID(),
      title,
      content,
      date: now.split('T')[0],
      updatedAt: now,
    };
    await addRow('analysisSyntheses', item);
    return item;
  }, [addRow]);

  const updateSynthesis = useCallback(async (id: string, updates: Partial<Pick<AnalysisSynthesis, 'title' | 'content'>>) => {
    await updateRow('analysisSyntheses', id, { ...updates, updatedAt: new Date().toISOString() });
  }, [updateRow]);

  const deleteSynthesis = useCallback(async (id: string) => {
    await deleteRow('analysisSyntheses', id);
  }, [deleteRow]);

  return { syntheses, addSynthesis, updateSynthesis, deleteSynthesis };
};
