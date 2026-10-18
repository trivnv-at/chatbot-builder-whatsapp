import { z } from 'zod';
import { redis } from './redis.js';
import { decryptSecret, encryptSecret, hashSecret } from './secret-box.js';

export const AI_PROTOCOLS = ['openai', 'gemini', 'anthropic'] as const;
export type AiProtocol = (typeof AI_PROTOCOLS)[number];

const REDIS_KEY = 'ai:config';

const inputSchema = z.object({
  provider: z.string().min(1).max(40),
  protocol: z.enum(AI_PROTOCOLS).default('openai'),
  baseUrl: z.string().url().max(300),
  model: z.string().min(1).max(120),
  apiKey: z.string().min(8).max(500).optional()
});

export type AiConfigInput = z.infer<typeof inputSchema>;

interface StoredAiConfig {
  provider: string;
  protocol: AiProtocol;
  baseUrl: string;
  model: string;
  keyCipher: string;
  keyHash: string;
  updatedAt: string;
}

export interface PublicAiConfig {
  provider: string;
  protocol: AiProtocol;
  baseUrl: string;
  model: string;
  keyHash: string;
  hasKey: boolean;
  updatedAt: string;
}

export interface AiCredentials {
  protocol: AiProtocol;
  baseUrl: string;
  model: string;
  apiKey: string;
}

function toPublic(config: StoredAiConfig): PublicAiConfig {
  return {
    provider: config.provider,
    protocol: config.protocol,
    baseUrl: config.baseUrl,
    model: config.model,
    keyHash: config.keyHash,
    hasKey: config.keyCipher.length > 0,
    updatedAt: config.updatedAt
  };
}

async function loadStored(): Promise<StoredAiConfig | null> {
  const raw = await redis.get(REDIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAiConfig;
  } catch {
    return null;
  }
}

export async function getPublicAiConfig(): Promise<PublicAiConfig | null> {
  const stored = await loadStored();
  return stored ? toPublic(stored) : null;
}

export async function saveAiConfig(input: unknown): Promise<PublicAiConfig> {
  const parsed = inputSchema.parse(input);
  const existing = await loadStored();

  const apiKey = parsed.apiKey?.trim();
  const keyCipher = apiKey ? encryptSecret(apiKey) : existing?.keyCipher;
  const keyHash = apiKey ? hashSecret(apiKey) : existing?.keyHash;
  if (!keyCipher || !keyHash) throw new Error('api_key_required');

  const stored: StoredAiConfig = {
    provider: parsed.provider,
    protocol: parsed.protocol,
    baseUrl: parsed.baseUrl.replace(/\/+$/, ''),
    model: parsed.model,
    keyCipher,
    keyHash,
    updatedAt: new Date().toISOString()
  };

  await redis.set(REDIS_KEY, JSON.stringify(stored));
  return toPublic(stored);
}

export async function resolveAiCredentials(): Promise<AiCredentials | null> {
  const stored = await loadStored();
  if (!stored) return null;
  try {
    return {
      protocol: stored.protocol,
      baseUrl: stored.baseUrl,
      model: stored.model,
      apiKey: decryptSecret(stored.keyCipher)
    };
  } catch {
    return null;
  }
}
