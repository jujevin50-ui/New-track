import type { Screenshot } from '@/types/note';

const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const SCREENSHOT_ACCEPT = SCREENSHOT_TYPES.join(',');

export function readScreenshot(file: File): Promise<Screenshot> {
  if (!SCREENSHOT_TYPES.includes(file.type)) throw new Error('Choisissez des images PNG, JPEG, WebP ou GIF.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Chaque capture doit faire moins de 5 Mo.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire la capture.'));
    reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, content: String(reader.result) });
    reader.readAsDataURL(file);
  });
}
