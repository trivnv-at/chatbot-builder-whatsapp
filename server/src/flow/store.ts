import { redis } from '../redis.js';
import type { Flow } from '../types.js';
import { flowSchema } from './schema.js';

export async function saveFlow(flow: unknown): Promise<Flow> {
  const parsed = flowSchema.parse(flow);
  await redis.set(`flow:${parsed.id}`, JSON.stringify(parsed));
  return parsed as Flow;
}

export async function loadFlow(id: string): Promise<Flow | null> {
  const raw = await redis.get(`flow:${id}`);
  if (!raw) return null;

  const parsed = flowSchema.safeParse(JSON.parse(raw));
  return parsed.success ? (parsed.data as Flow) : null;
}
