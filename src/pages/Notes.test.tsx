import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DataProvider, useData } from '@/contexts/DataContext';
import { DEFAULT_DATA, normalizeData, readLocalData, writeLocalData } from '@/lib/fileStorage';
import Notes from './Notes';
import * as fileStorage from '@/lib/fileStorage';

beforeEach(() => { localStorage.clear(); writeLocalData({ ...DEFAULT_DATA }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
function ConnectedNotes() {
  const { status } = useData();
  return status === 'connected' ? <Notes /> : <p>Chargement</p>;
}
async function openNotes() {
  render(<DataProvider><ConnectedNotes /></DataProvider>);
  await screen.findByRole('heading', { name: 'Notes' });
}
it('normalizes older files without losing existing trades', () => {
  const data = normalizeData({ trades: [{ id: 'existing' }] });
  expect(data.notes).toEqual([]);
  expect(data.trades).toEqual([{ id: 'existing' }]);
});
it('creates, edits, searches, reloads and deletes notes with multiple screenshots', async () => {
  await openNotes();
  fireEvent.click(screen.getByText('Nouvelle note'));
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Plan EURUSD' } });
  fireEvent.change(screen.getByLabelText('Explications'), { target: { value: 'Attendre le retour au support' } });
  fireEvent.change(screen.getByLabelText(/Ajouter des captures/), { target: { files: [new File(['one'], 'avant.png', { type: 'image/png' }), new File(['two'], 'apres.png', { type: 'image/png' })] } });
  await screen.findByText('Retirer apres.png');
  fireEvent.click(screen.getByText('Enregistrer'));
  await screen.findByRole('heading', { name: 'Plan EURUSD' });
  expect(readLocalData()?.notes[0].screenshots).toHaveLength(2);
  cleanup();
  await openNotes();
  expect(await screen.findByRole('heading', { name: 'Plan EURUSD' })).toBeVisible();
  fireEvent.change(screen.getByLabelText('Rechercher des notes'), { target: { value: 'support' } });
  expect(screen.getByText('Plan EURUSD')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Rechercher des notes'), { target: { value: 'absent' } });
  expect(screen.queryByText('Plan EURUSD')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Rechercher des notes'), { target: { value: '' } });
  fireEvent.click(screen.getByText('Modifier'));
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Plan corrigé' } });
  fireEvent.click(screen.getByText('Retirer avant.png'));
  fireEvent.click(screen.getByText('Enregistrer'));
  await screen.findByRole('heading', { name: 'Plan corrigé' });
  expect(readLocalData()?.notes[0].screenshots).toHaveLength(1);
  fireEvent.click(screen.getByText('Supprimer'));
  fireEvent.click(screen.getByText('Annuler'));
  expect(readLocalData()?.notes).toHaveLength(1);
  fireEvent.click(screen.getByText('Supprimer'));
  fireEvent.click(screen.getByText('Confirmer la suppression'));
  await waitFor(() => expect(readLocalData()?.notes).toHaveLength(0));
});
it('keeps the draft and shows an error when persistence fails', async () => {
  await openNotes();
  fireEvent.click(screen.getByText('Nouvelle note'));
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'À conserver' } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
  fireEvent.click(screen.getByText('Enregistrer'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Stockage local plein');
  expect(screen.getByLabelText('Titre')).toHaveValue('À conserver');
  expect(readLocalData()?.notes).toHaveLength(0);
});

it('writes notes and embedded screenshots through the existing JSON file workflow', async () => {
  let saved = JSON.stringify({ version: 1, trades: [{ id: 'existing-trade' }] });
  const handle = {
    queryPermission: async () => 'granted',
    getFile: async () => ({ text: async () => saved }),
    createWritable: async () => ({ write: async (value: string) => { saved = value; }, close: async () => {} }),
  } as unknown as FileSystemFileHandle;
  vi.spyOn(fileStorage, 'getStoredHandle').mockResolvedValue(handle);
  await openNotes();
  fireEvent.click(screen.getByText('Nouvelle note'));
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Note fichier' } });
  fireEvent.change(screen.getByLabelText(/Ajouter des captures/), { target: { files: [new File(['image'], 'capture.png', { type: 'image/png' })] } });
  await screen.findByText('Retirer capture.png');
  fireEvent.click(screen.getByText('Enregistrer'));
  await screen.findByRole('heading', { name: 'Note fichier' });
  const data = JSON.parse(saved);
  expect(data.trades).toEqual([{ id: 'existing-trade' }]);
  expect(data.notes[0].screenshots[0].content).toBe('data:image/png;base64,aW1hZ2U=');
  cleanup();
  await openNotes();
  expect(await screen.findByRole('heading', { name: 'Note fichier' })).toBeVisible();
});

it('pastes and drops images, reads a note and navigates its enlarged screenshots', async () => {
  await openNotes();
  fireEvent.click(screen.getByText('Nouvelle note'));
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Analyse visuelle' } });
  fireEvent.paste(screen.getByLabelText('Explications'), { clipboardData: { items: [{ type: 'image/png', getAsFile: () => new File(['paste'], 'collee.png', { type: 'image/png' }) }] } });
  await screen.findByText('Retirer collee.png');
  fireEvent.drop(screen.getByRole('group'), { dataTransfer: { files: [new File(['drop'], 'deposee.png', { type: 'image/png' })] } });
  await screen.findByText('Retirer deposee.png');
  fireEvent.click(screen.getByText('Enregistrer'));
  await screen.findByRole('heading', { name: 'Analyse visuelle' });
  expect(readLocalData()?.notes[0].screenshots).toHaveLength(2);
  fireEvent.click(screen.getByText('Lire'));
  fireEvent.click(screen.getAllByLabelText('Agrandir collee.png').at(-1)!);
  expect(screen.getByText(/Capture 1 sur 2/)).toBeVisible();
  fireEvent.click(screen.getByLabelText('Image suivante'));
  expect(screen.getByText(/Capture 2 sur 2/)).toBeVisible();
  fireEvent.keyDown(screen.getAllByRole('dialog').at(-1)!, { key: 'ArrowLeft' });
  expect(screen.getByText(/Capture 1 sur 2/)).toBeVisible();
  fireEvent.click(screen.getByText('Taille réelle'));
  expect(screen.getByText('Ajuster')).toBeVisible();
});

it('reports unsupported pasted images without discarding the draft', async () => {
  await openNotes();
  fireEvent.click(screen.getByText('Nouvelle note'));
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Brouillon' } });
  fireEvent.paste(screen.getByLabelText('Explications'), { clipboardData: { items: [{ type: 'image/svg+xml', getAsFile: () => new File(['svg'], 'image.svg', { type: 'image/svg+xml' }) }] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Choisissez des images PNG');
  expect(screen.getByLabelText('Titre')).toHaveValue('Brouillon');
});
