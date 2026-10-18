import type { AiProtocol } from './ai-config.js';

export interface ChatRequest {
  protocol: AiProtocol;
  baseUrl: string;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

const REQUEST_TIMEOUT_MS = 15_000;

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

async function callOpenAiCompatible(input: ChatRequest): Promise<string> {
  const response = await fetch(`${trimBase(input.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user }
      ],
      temperature: input.temperature ?? 0.4,
      max_tokens: input.maxTokens ?? 512
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) throw new Error(`ai_http_${response.status}`);

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callGemini(input: ChatRequest): Promise<string> {
  const url = `${trimBase(input.baseUrl)}/models/${input.model}:generateContent?key=${input.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: input.user }] }],
      generationConfig: {
        maxOutputTokens: input.maxTokens ?? 512,
        temperature: input.temperature ?? 0.4
      }
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) throw new Error(`ai_http_${response.status}`);

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function callAnthropic(input: ChatRequest): Promise<string> {
  const response = await fetch(`${trimBase(input.baseUrl)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: input.model,
      system: input.system,
      max_tokens: input.maxTokens ?? 512,
      temperature: input.temperature ?? 0.4,
      messages: [{ role: 'user', content: input.user }]
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) throw new Error(`ai_http_${response.status}`);

  const payload = (await response.json()) as { content?: Array<{ text?: string }> };
  return payload.content?.[0]?.text?.trim() ?? '';
}

export async function callChatModel(input: ChatRequest): Promise<string> {
  if (input.protocol === 'gemini') return callGemini(input);
  if (input.protocol === 'anthropic') return callAnthropic(input);
  return callOpenAiCompatible(input);
}
