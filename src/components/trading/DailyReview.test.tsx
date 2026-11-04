import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DailyReview from './DailyReview';
import type { DailyJournal } from '@/hooks/useDailyJournal';

beforeAll(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

const existing: DailyJournal = {
  date: '2026-11-04', strategyRespected: false, productive: true, mood: 'good',
  discipline: 4, confidence: 5, notes: 'Note existante', lessonsLearned: 'Attendre',
  mistakes: ['Entrée tardive'], goals: 'Respecter le plan', event: 'challenge_realise',
};

describe('Inline daily review', () => {
  it('edits the existing entry without discarding journal fields', async () => {
    const onSave = vi.fn<(journal: DailyJournal) => Promise<void>>().mockResolvedValue();
    render(<DailyReview date={existing.date} existing={existing} trades={[]} onSave={onSave} />);
    expect(screen.getByLabelText('Notes du jour')).toHaveValue('Note existante');
    fireEvent.change(screen.getByLabelText('Notes du jour'), { target: { value: 'Note révisée' } });
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le bilan' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Enregistré');
    expect(onSave).toHaveBeenCalledWith({ ...existing, notes: 'Note révisée', strategyRespected: true });
  });

  it('keeps the draft available after a save error', async () => {
    const onSave = vi.fn<(journal: DailyJournal) => Promise<void>>().mockRejectedValue(new Error('Sauvegarde indisponible'));
    render(<DailyReview date={existing.date} existing={existing} trades={[]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('À retenir'), { target: { value: 'Une nouvelle leçon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le bilan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sauvegarde indisponible');
    expect(screen.getByLabelText('À retenir')).toHaveValue('Une nouvelle leçon');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
