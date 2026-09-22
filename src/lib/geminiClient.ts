export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GeminiImageInput {
  mimeType: string;
  data: string;
}

const GEMINI_MODEL = 'gemini-3.6-flash';

async function requestGemini(apiKey: string, body: Record<string, unknown>) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || `Erreur Gemini (${response.status})`);
  }
  return response.json();
}

function getText(data: any): string {
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('') || '';
  if (!text) throw new Error("L'IA n'a renvoyé aucune donnée.");
  return text;
}

export async function askGemini(
  apiKey: string,
  systemInstruction: string,
  history: GeminiMessage[],
): Promise<string> {
  const data = await requestGemini(apiKey, {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: history.map(message => ({
      role: message.role,
      parts: [{ text: message.content }],
    })),
  });
  return getText(data);
}

export async function askGeminiWithImages(
  apiKey: string,
  systemInstruction: string,
  prompt: string,
  images: GeminiImageInput[],
): Promise<string> {
  const data = await requestGemini(apiKey, {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        ...images.map(image => ({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        })),
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });
  return getText(data);
}
