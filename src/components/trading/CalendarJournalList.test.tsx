import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CalendarJournalList from './CalendarJournalList';
import { newDailyJournal } from '@/lib/discipline';
afterEach(cleanup);
const journals=[{...newDailyJournal('2026-11-09'),notes:'Attendre la confirmation avant une entrée.',lessonsLearned:'Respecter le risque.'},{...newDailyJournal('2026-10-30'),notes:'Une ancienne note doit rester visible.'},{...newDailyJournal('2026-11-07'),notes:'Week-end exclu'}];
const props={journals,daily:[],month:'2026-11',today:'2026-11-11',selectedDate:'2026-11-09',onSelectDate:vi.fn(),currency:'EUR'};
describe('daily review list',()=>{
  it('shows saved notes from the whole history while excluding weekends',()=>{
    render(<CalendarJournalList {...props}/>);
    expect(screen.getByText('Une ancienne note doit rester visible.')).toBeInTheDocument();
    expect(screen.getByText('Attendre la confirmation avant une entrée.')).toBeInTheDocument();
    expect(screen.queryByText('Week-end exclu')).not.toBeInTheDocument();
  });
  it('searches note content and selects the requested day without editing it',()=>{
    const select=vi.fn();render(<CalendarJournalList {...props} onSelectDate={select}/>);
    fireEvent.change(screen.getByLabelText('Recherche dans les notes'),{target:{value:'ancienne'}});
    expect(screen.queryByText('Attendre la confirmation avant une entrée.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Consulter le bilan du 2026-10-30'}));
    expect(select).toHaveBeenCalledExactlyOnceWith('2026-10-30');
  });
});
