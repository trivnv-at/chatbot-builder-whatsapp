import { Queue } from 'bullmq';
import { redis } from './redis.js';

export const QUEUE_PREFIX = 'flowbot';

export interface InboundJob {
  flowId: string;
  phone: string;
  text: string;
  messageId?: string;
}

export interface ResumeJob {
  flowId: string;
  phone: string;
  socket: string;
}

export const inboxQueue = new Queue<InboundJob>('inbound', {
  connection: redis,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
    removeOnComplete: 1_000,
    removeOnFail: 5_000
  }
});

export const resumeQueue = new Queue<ResumeJob>('resume', {
  connection: redis,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 1_000,
    removeOnFail: 5_000
  }
});

export const resumeJobId = (phone: string) => `resume-${phone}`;
