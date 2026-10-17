import 'dotenv/config';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { config } from './config.js';
import { loadFlow, saveFlow } from './flow/store.js';
import { claimMessage, verifyApiKey, verifyWebhookSignature } from './security.js';
import { enqueueInbound, startWorkers } from './worker.js';
import { inboxQueue, resumeQueue } from './queue.js';
import { redis } from './redis.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}

const directMessageSchema = z.object({
  flowId: z.string().min(1).max(80).optional(),
  from: z.string().min(5).max(32),
  text: z.string().max(4_096),
  messageId: z.string().max(120).optional()
});

const metaMessageSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                messages: z
                  .array(
                    z.object({
                      id: z.string(),
                      from: z.string(),
                      text: z.object({ body: z.string() }).optional()
                    })
                  )
                  .optional()
              })
            })
          )
          .optional()
      })
    )
    .optional()
});

interface ParsedMessage {
  flowId: string;
  from: string;
  text: string;
  messageId?: string;
}

function parseMessage(body: unknown, fallbackFlowId?: string): ParsedMessage | null {
  const direct = directMessageSchema.safeParse(body);
  if (direct.success) {
    const flowId = direct.data.flowId ?? fallbackFlowId;
    if (!flowId) return null;
    return {
      flowId,
      from: direct.data.from,
      text: direct.data.text,
      messageId: direct.data.messageId
    };
  }

  const meta = metaMessageSchema.safeParse(body);
  if (!meta.success || !fallbackFlowId) return null;

  const message = meta.data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return null;

  return {
    flowId: fallbackFlowId,
    from: message.from,
    text: message.text?.body ?? '',
    messageId: message.id
  };
}

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  bodyLimit: 1_048_576,
  trustProxy: true
});

app.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (request, body, done) => {
    const raw = typeof body === 'string' ? body : body.toString('utf8');
    request.rawBody = raw;

    try {
      done(null, JSON.parse(raw));
    } catch (error) {
      done(error as Error, undefined);
    }
  }
);

await app.register(helmet);
await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

app.get('/health', async () => ({ ok: true }));

app.put('/flows/:id', async (request, reply) => {
  if (!verifyApiKey(request.headers['x-api-key'])) {
    return reply.code(401).send({ error: 'unauthorized' });
  }

  const params = z.object({ id: z.string().min(1).max(80) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ error: 'invalid_flow_id' });
  }

  const body = request.body;
  if (!body || typeof body !== 'object') {
    return reply.code(400).send({ error: 'invalid_body' });
  }

  const flow = { ...(body as Record<string, unknown>), id: params.data.id };
  const result = await saveFlow(flow).catch((error: z.ZodError | Error) => error);

  if (result instanceof z.ZodError) {
    return reply.code(422).send({ error: 'invalid_flow', issues: result.issues });
  }
  if (result instanceof Error) {
    return reply.code(400).send({ error: result.message });
  }

  return { ok: true, flow: result };
});

app.get('/flows/:id', async (request, reply) => {
  if (!verifyApiKey(request.headers['x-api-key'])) {
    return reply.code(401).send({ error: 'unauthorized' });
  }

  const params = z.object({ id: z.string().min(1).max(80) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ error: 'invalid_flow_id' });
  }

  const flow = await loadFlow(params.data.id);
  if (!flow) return reply.code(404).send({ error: 'not_found' });

  return { flow };
});

app.post('/webhook/whatsapp', async (request, reply) => {
  const rawBody = request.rawBody ?? '';
  if (!verifyWebhookSignature(rawBody, request.headers['x-hub-signature-256'])) {
    return reply.code(401).send({ error: 'invalid_signature' });
  }

  const query = z
    .object({ flowId: z.string().min(1).max(80).optional() })
    .safeParse(request.query);

  const fallbackFlowId =
    (query.success ? query.data.flowId : undefined) ?? config.DEFAULT_FLOW_ID;

  const parsed = parseMessage(request.body, fallbackFlowId);
  if (!parsed) {
    return reply.code(400).send({ error: 'invalid_payload' });
  }

  const fresh = await claimMessage(parsed.messageId);
  if (!fresh) {
    return reply.code(200).send({ ok: true, duplicate: true });
  }

  await enqueueInbound({
    flowId: parsed.flowId,
    phone: parsed.from,
    text: parsed.text,
    messageId: parsed.messageId
  });
  return reply.code(200).send({ ok: true });
});

const workers = startWorkers();

const shutdown = async (): Promise<void> => {
  await Promise.allSettled([
    ...workers.map((worker) => worker.close()),
    inboxQueue.close(),
    resumeQueue.close(),
    app.close(),
    redis.quit()
  ]);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.PORT, host: '0.0.0.0' });
