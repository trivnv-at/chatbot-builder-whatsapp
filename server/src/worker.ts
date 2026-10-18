import { Worker } from 'bullmq';
import { redis } from './redis.js';
import { askAi } from './ai.js';
import { sendCapiEvent } from './capi.js';
import { config } from './config.js';
import { executeFlow } from './engine/executor.js';
import { loadFlow } from './flow/store.js';
import { createState, loadState, resetTurn, saveState } from './flow/state.js';
import { safeHttpRequest } from './http.js';
import {
  inboxQueue,
  QUEUE_PREFIX,
  resumeJobId,
  resumeQueue,
  type InboundJob,
  type ResumeJob
} from './queue.js';
import { loadOfficeHours } from './settings.js';
import { sendWhatsApp } from './whatsapp.js';
import type { ConversationState, Flow } from './types.js';

const deps = {
  send: sendWhatsApp,
  schedule: async (state: ConversationState, delayMs: number, socket: string | null) => {
    if (!socket) return;
    const jobId = resumeJobId(state.phone);
    const existing = await resumeQueue.getJob(jobId);
    if (existing) await existing.remove().catch(() => undefined);

    await resumeQueue.add(
      'resume',
      { flowId: state.flowId, phone: state.phone, socket },
      { delay: delayMs, jobId }
    );
  },
  http: safeHttpRequest,
  ai: askAi,
  capi: sendCapiEvent,
  officeHours: loadOfficeHours
};

function resumeSocketFor(flow: Flow, nodeId: string): string {
  const node = flow.nodes.find((item) => item.id === nodeId);
  if (node?.type === 'sendButtonsNode') return 'btn1';
  if (node?.type === 'sendListNode') return 'selected';
  return 'reply';
}

async function cancelPendingResume(phone: string): Promise<void> {
  const job = await resumeQueue.getJob(resumeJobId(phone));
  if (job) await job.remove().catch(() => undefined);
}

async function processInbound(job: { data: InboundJob }): Promise<void> {
  const { flowId, phone, text } = job.data;
  const flow = await loadFlow(flowId);
  if (!flow) throw new Error(`Flow ${flowId} tidak ditemukan`);

  const stored = await loadState(phone);
  const pendingWait = stored && stored.flowId === flowId ? stored.pendingWait : null;

  let state: ConversationState;
  if (!stored || stored.flowId !== flowId || stored.handoff) {
    state = createState(flowId, phone);
  } else {
    state = stored;
    resetTurn(state);
  }

  await cancelPendingResume(phone);
  state.vars.lastReply = text;

  let resumeSocket: string | null = null;
  if (pendingWait) {
    state.cursor = pendingWait;
    state.pendingWait = pendingWait;
    resumeSocket = resumeSocketFor(flow, pendingWait);
  }

  const result = await executeFlow({
    state,
    flow,
    inbound: { text },
    resumeSocket,
    deps
  });

  await saveState(result.state);
}

async function processResume(job: { data: ResumeJob }): Promise<void> {
  const { flowId, phone, socket } = job.data;
  const flow = await loadFlow(flowId);
  if (!flow) return;

  const state = await loadState(phone);
  if (!state || state.flowId !== flowId || !state.pendingWait) return;

  const result = await executeFlow({
    state,
    flow,
    inbound: { text: '' },
    resumeSocket: socket,
    deps
  });

  await saveState(result.state);
}

export function startWorkers(): Worker[] {
  const inboundWorker = new Worker('inbound', processInbound, {
    connection: redis,
    prefix: QUEUE_PREFIX,
    concurrency: 10
  });

  const resumeWorker = new Worker('resume', processResume, {
    connection: redis,
    prefix: QUEUE_PREFIX,
    concurrency: 10
  });

  inboundWorker.on('failed', (job, error) => {
    console.error('[worker:inbound]', job?.id, error.message);
  });

  resumeWorker.on('failed', (job, error) => {
    console.error('[worker:resume]', job?.id, error.message);
  });

  return [inboundWorker, resumeWorker];
}

export async function enqueueInbound(payload: InboundJob): Promise<void> {
  await inboxQueue.add('message', payload, {
    jobId: payload.messageId ? `in-${payload.messageId}` : undefined
  });
}

export { config };
