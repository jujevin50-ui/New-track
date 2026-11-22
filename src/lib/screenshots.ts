import type { Screenshot } from '@/types/note';

const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const SCREENSHOT_ACCEPT = SCREENSHOT_TYPES.join(',');

export function pastedImage(data: DataTransfer): File | undefined {
  return Array.from(data.files).find(file => file.type.startsWith('image/'))
    ?? Array.from(data.items).find(item => item.type.startsWith('image/'))?.getAsFile()
    ?? undefined;
}

export async function readClipboardImage(name: string): Promise<File> {
  let items: ClipboardItems;
  try {
    items = await navigator.clipboard.read();
  } catch {
    throw new Error('Sélectionne ce bouton, puis colle ton image avec Ctrl+V ou ⌘V.');
  }
  for (const item of items) {
    const type = item.types.find(value => SCREENSHOT_TYPES.includes(value));
    if (type) {
      const blob = await item.getType(type);
      return new File([blob], `${name}.${type.split('/')[1]}`, { type });
    }
  }
  throw new Error('Copie une image PNG, JPEG, WebP ou GIF avant de la coller.');
}

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
