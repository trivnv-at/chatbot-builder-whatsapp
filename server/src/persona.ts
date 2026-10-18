import { redis } from './redis.js';

const REDIS_KEY = 'persona:config';
const MAX_CHARS = 100_000;

export async function getPersonaConfig(): Promise<Record<string, unknown> | null> {
  const raw = await redis.get(REDIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function savePersonaConfig(input: unknown): Promise<Record<string, unknown>> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('invalid_persona_config');
  }
  const json = JSON.stringify(input);
  if (json.length > MAX_CHARS) throw new Error('persona_config_too_large');

  await redis.set(REDIS_KEY, json);
  return input as Record<string, unknown>;
}
