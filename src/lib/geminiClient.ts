export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

const GEMINI_MODEL = 'gemini-3.6-flash';

export async function askGemini(apiKey: string, systemInstruction: string, history: GeminiMessage[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: history.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `Erreur API Gemini (${res.status})`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
  if (!text) throw new Error('Réponse vide de l\'IA.');
  return text;
}
