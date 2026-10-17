import { redis } from '../redis.js';
import { config } from '../config.js';
import type { ConversationState } from '../types.js';

const keyFor = (phone: string) => `conv:${phone}`;

export function createState(flowId: string, phone: string): ConversationState {
  return {
    flowId,
    phone,
    cursor: null,
    pendingWait: null,
    vars: { phone },
    visits: {},
    steps: 0,
    handoff: false,
    updatedAt: new Date().toISOString()
  };
}

export async function loadState(phone: string): Promise<ConversationState | null> {
  const raw = await redis.get(keyFor(phone));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ConversationState;
  } catch {
    return null;
  }
}

export async function saveState(state: ConversationState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await redis.set(keyFor(state.phone), JSON.stringify(state), 'EX', config.CONVERSATION_TTL_SECONDS);
}

export async function clearState(phone: string): Promise<void> {
  await redis.del(keyFor(phone));
}

export function resetTurn(state: ConversationState): void {
  state.steps = 0;
  state.visits = {};
  state.pendingWait = null;
}
