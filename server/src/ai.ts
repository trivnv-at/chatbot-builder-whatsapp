import { config } from './config.js';
import type { AiConfigInput } from './ai-config.js';
import { resolveAiCredentials } from './ai-config.js';
import { callChatModel } from './ai-providers.js';

const BUSY_REPLY = 'Maaf, layanan AI sedang sibuk. Tim kami akan segera membantu.';
const EMPTY_REPLY = 'Baik, boleh dijelaskan lebih detail?';
const NO_KEY_REPLY = 'Terima kasih atas pesannya. Tim kami akan segera membantu.';

export async function askAi(input: {
  prompt: string;
  user: string;
  model?: string;
}): Promise<string> {
  const credentials = await resolveAiCredentials().catch(() => null);

  if (credentials) {
    try {
      const text = await callChatModel({
        protocol: credentials.protocol,
        baseUrl: credentials.baseUrl,
        model: input.model?.trim() || credentials.model,
        apiKey: credentials.apiKey,
        system: input.prompt,
        user: input.user
      });
      return text || EMPTY_REPLY;
    } catch {
      return BUSY_REPLY;
    }
  }

  if (config.GEMINI_API_KEY) {
    try {
      const text = await callChatModel({
        protocol: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: config.GEMINI_MODEL,
        apiKey: config.GEMINI_API_KEY,
        system: input.prompt,
        user: input.user
      });
      return text || EMPTY_REPLY;
    } catch {
      return BUSY_REPLY;
    }
  }

  return NO_KEY_REPLY;
}

export async function probeAi(
  input: unknown
): Promise<{ ok: boolean; status: number; message: string }> {
  const body = (input ?? {}) as Partial<AiConfigInput>;
  const stored = await resolveAiCredentials().catch(() => null);
  const protocol = body.protocol ?? stored?.protocol ?? 'openai';
  const baseUrl = body.baseUrl ?? stored?.baseUrl;
  const model = body.model ?? stored?.model;
  const apiKey = body.apiKey?.trim() || stored?.apiKey;

  if (!baseUrl || !model || !apiKey) {
    return { ok: false, status: 400, message: 'konfigurasi belum lengkap' };
  }

  try {
    const text = await callChatModel({
      protocol,
      baseUrl,
      model,
      apiKey,
      system: 'Anda asisten uji koneksi. Balas dengan satu kata singkat.',
      user: 'ping',
      maxTokens: 32
    });
    return { ok: true, status: 200, message: text || 'ok' };
  } catch (error) {
    return { ok: false, status: 502, message: (error as Error).message };
  }
}
