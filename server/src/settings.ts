import { z } from 'zod';
import { redis } from './redis.js';
import type { OfficeHours } from './types.js';

const REDIS_KEY = 'settings:office-hours';

const schema = z.object({
  enabled: z.boolean().default(false),
  startHour: z.number().int().min(0).max(23).default(9),
  endHour: z.number().int().min(1).max(24).default(18)
});

export async function loadOfficeHours(): Promise<OfficeHours> {
  const raw = await redis.get(REDIS_KEY);
  if (!raw) return schema.parse({});
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return schema.parse({});
  }
}

export async function saveOfficeHours(input: unknown): Promise<OfficeHours> {
  const parsed = schema.parse(input);
  await redis.set(REDIS_KEY, JSON.stringify(parsed));
  return parsed;
}
