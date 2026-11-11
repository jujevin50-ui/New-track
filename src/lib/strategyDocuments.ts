export interface StrategyDocument {
  accountId?: string;
  id: string;
  name: string;
  kind: 'pdf' | 'docx' | 'html';
  size: number;
  createdAt: string;
  content: string;
}

export function documentBuffer(content: string): ArrayBuffer {
  const binary = atob(content);
  return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
}

export async function wordPreview(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, {
    styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => p.subtitle:fresh"],
  });
  return result.value;
}

export function wordFrame(html: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>
    *{box-sizing:border-box}body{margin:0;background:#fff;color:#20242b;font:16px/1.8 system-ui,sans-serif;padding:40px;overflow-wrap:anywhere}article{max-width:760px;margin:auto}h1,h2,h3{line-height:1.3;margin:1.6em 0 .7em}h1:first-child,h2:first-child,p:first-child{margin-top:0}p{margin:0 0 1.2em}img{max-width:100%;height:auto}table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse}td,th{padding:10px;border:1px solid #dde1e6}a{color:#3b5e9c}pre{white-space:pre-wrap}@media(max-width:600px){body{padding:24px 18px}}
    </style></head><body><article>${html}</article></body></html>`;
}

export async function importStrategyDocument(file: File): Promise<StrategyDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'docx' && extension !== 'html' && extension !== 'htm') throw new Error('Choisissez un PDF, un document Word (.docx) ou un fichier HTML.');
  if (!file.size) throw new Error('Ce fichier est vide.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Le fichier dépasse la limite de 10 Mo.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
    reader.readAsDataURL(file);
  });
  const content = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const buffer = documentBuffer(content);
  if (extension === 'pdf') {
    const header = new TextDecoder().decode(buffer.slice(0, 1024));
    if (!header.includes('%PDF-')) throw new Error('Ce fichier n’est pas un PDF valide.');
  } else if (extension === 'docx') {
    try { await wordPreview(buffer); }
    catch { throw new Error('Impossible de lire ce document Word. Utilisez un fichier .docx valide.'); }
  }
  return { id: crypto.randomUUID(), name: file.name, kind: extension === 'htm' ? 'html' : extension, size: file.size, createdAt: new Date().toISOString(), content };
}
