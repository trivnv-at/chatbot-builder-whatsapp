import { config } from './config.js';

export async function askGemini(input: { prompt: string; user: string }): Promise<string> {
  const key = config.GEMINI_API_KEY;
  if (!key) {
    return 'Terima kasih atas pesannya. Tim kami akan segera membantu.';
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.prompt }] },
        contents: [{ role: 'user', parts: [{ text: input.user }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.4 }
      }),
      signal: AbortSignal.timeout(15_000)
    }
  );

  if (!response.ok) {
    return 'Maaf, layanan AI sedang sibuk. Tim kami akan segera membantu.';
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const reply = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  return reply?.trim() || 'Baik, boleh dijelaskan lebih detail?';
}
