import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Discipline from './Discipline';
import { localDay, newDailyJournal } from '@/lib/discipline';
import type { DailyJournal } from '@/hooks/useDailyJournal';

beforeAll(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterAll(() => vi.unstubAllGlobals());

const mock = vi.hoisted(() => ({ journals: [] as DailyJournal[], save: vi.fn() }));
vi.mock('@/hooks/useDailyJournal', () => ({ useDailyJournal: () => ({ journals: mock.journals, getJournal: (date: string) => mock.journals.find(j => j.date === date) ?? null, saveJournal: mock.save }) }));
vi.mock('@/hooks/useTrades', () => ({ useTrades: () => ({ trades: [], allTrades: [] }) }));
afterEach(() => { cleanup(); mock.journals = []; mock.save.mockReset(); });

describe('Discipline session', () => {
  it('saves missions and daily review together without losing existing fields', async () => {
    mock.journals = [{ ...newDailyJournal(localDay()), mistakes: ['Ancienne erreur'], event: 'challenge_realise', notes: 'Note existante', mood: 'bad', disciplineTracking: { missions: [], stress: 4, triggers: ['FOMO'] } }];
    mock.save.mockResolvedValue(undefined);
    render(<Discipline activeAccount={null} accounts={[]} onSelectAccount={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Aucune entrée sans validation complète de la checklist/ }));
    fireEvent.change(screen.getByLabelText('Notes du jour'), { target: { value: 'J’ai pris une pause.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la journée' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Enregistré');
    expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({ notes: 'J’ai pris une pause.', mood: 'bad', mistakes: ['Ancienne erreur'], event: 'challenge_realise', disciplineTracking: { missions: ['prepare'], stress: 4, triggers: ['FOMO'] } }));
  });
  it('keeps the whole draft editable if saving fails and does not award saved XP', async () => {
    mock.save.mockRejectedValue(new Error('Écriture impossible'));
    render(<Discipline activeAccount={null} accounts={[]} onSelectAccount={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Risque respecté/ }));
    fireEvent.change(screen.getByLabelText('À retenir'), { target: { value: 'Attendre.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la journée' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Écriture impossible');
    expect(screen.getByRole('button', { name: /Risque respecté/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('À retenir')).toHaveValue('Attendre.');
    expect(screen.getByText('Expérience').parentElement).toHaveTextContent('0XP');
    expect(screen.getByRole('button', { name: 'Enregistrer la journée' })).toBeEnabled();
  });
  it('restores saved missions and asks before discarding an unsaved day', async () => {
    mock.journals = [{ ...newDailyJournal(localDay()), disciplineTracking: { missions: ['risk'], stress: 2, triggers: ['Fatigue'] } }];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Discipline activeAccount={null} accounts={[]} onSelectAccount={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Risque respecté/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Mon état d’esprit')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aucune entrée sans validation complète de la checklist/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Jour précédent' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText('Date de discipline')).toHaveValue(localDay());
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Jour précédent' }));
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0'));
    confirm.mockRestore();
  });
});
