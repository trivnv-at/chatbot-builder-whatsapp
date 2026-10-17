import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { redis } from './redis.js';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: unknown): boolean {
  if (!config.WEBHOOK_APP_SECRET) return true;
  if (typeof signature !== 'string') return false;

  const expected = `sha256=${createHmac('sha256', config.WEBHOOK_APP_SECRET)
    .update(rawBody)
    .digest('hex')}`;

  return safeEqual(expected, signature);
}

export function verifyApiKey(provided: unknown): boolean {
  return typeof provided === 'string' && safeEqual(provided, config.FLOW_API_KEY);
}

export async function claimMessage(messageId: string | undefined): Promise<boolean> {
  if (!messageId) return true;
  const result = await redis.set(`msg:${messageId}`, '1', 'EX', 86_400, 'NX');
  return result === 'OK';
}
