import assert from 'node:assert/strict';
import test from 'node:test';
import { executeFlow } from './executor.js';
import { evaluateComparison, evaluateContains, evaluateEmpty, safeRegex } from './expression.js';
import { resolveTemplate, resolveText } from './context.js';
import type { ConversationState, ExecutorDeps, Flow, FlowEdge, FlowNode, OutboundMessage } from '../types.js';

function makeState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    flowId: 'test',
    phone: '628000000000',
    cursor: null,
    pendingWait: null,
    vars: { phone: '628000000000' },
    visits: {},
    steps: 0,
    handoff: false,
    updatedAt: '',
    ...overrides
  };
}

function makeDeps(sent: OutboundMessage[], scheduled: Array<{ delayMs: number; socket: string | null }>): ExecutorDeps {
  return {
    send: async (message) => {
      sent.push(message);
    },
    schedule: async (_state, delayMs, socket) => {
      scheduled.push({ delayMs, socket });
    },
    http: async () => ({ status: 200, data: { ok: true } }),
    ai: async () => 'balasan ai',
    capi: async () => undefined
  };
}

function makeFlow(nodes: FlowNode[], edges: FlowEdge[]): Flow {
  return { id: 'test', nodes, edges };
}

const node = (id: string, type: string, data: Record<string, unknown> = {}): FlowNode => ({
  id,
  type,
  data
});

const edge = (id: string, source: string, sourceHandle: string, target: string): FlowEdge => ({
  id,
  source,
  sourceHandle,
  target,
  targetHandle: 'in'
});

test('kondisi numerik mengarahkan alur ke cabang true', async () => {
  const sent: OutboundMessage[] = [];
  const flow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'conditionNode', { operandA: '10', operator: '>=', operandB: '5' }),
      node('n3', 'sendTextNode', { body: 'lolos' })
    ],
    [edge('e1', 'n1', 'out', 'n2'), edge('e2', 'n2', 'true', 'n3')]
  );

  const result = await executeFlow({
    state: makeState(),
    flow,
    inbound: { text: 'halo' },
    deps: makeDeps(sent, [])
  });

  assert.equal(result.outcome, 'done');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, 'lolos');
});

test('kondisi mengarahkan ke cabang false saat tidak terpenuhi', async () => {
  const sent: OutboundMessage[] = [];
  const flow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'conditionNode', { operandA: '1', operator: '>', operandB: '5' }),
      node('n3', 'sendTextNode', { body: 'true path' }),
      node('n4', 'sendTextNode', { body: 'false path' })
    ],
    [edge('e1', 'n1', 'out', 'n2'), edge('e2', 'n2', 'true', 'n3'), edge('e3', 'n2', 'false', 'n4')]
  );

  await executeFlow({ state: makeState(), flow, inbound: { text: 'halo' }, deps: makeDeps(sent, []) });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, 'false path');
});

test('loop guard menghentikan alur dan menandai handoff', async () => {
  const flow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'conditionNode', { operandA: '1', operator: '==', operandB: '1' })
    ],
    [edge('e1', 'n1', 'out', 'n2'), edge('e2', 'n2', 'true', 'n1')]
  );

  const result = await executeFlow({
    state: makeState(),
    flow,
    inbound: { text: 'loop' },
    deps: makeDeps([], [])
  });

  assert.equal(result.outcome, 'handoff');
  assert.equal(result.reason, 'loop_guard');
  assert.equal(result.state.handoff, true);
  assert.ok(Math.max(...Object.values(result.state.visits)) <= 13);
});

test('delay menjadwalkan resume pada socket out', async () => {
  const scheduled: Array<{ delayMs: number; socket: string | null }> = [];
  const flow = makeFlow(
    [node('n1', 'onMessageNode'), node('n2', 'delayNode', { duration: 2 })],
    [edge('e1', 'n1', 'out', 'n2')]
  );

  const result = await executeFlow({
    state: makeState(),
    flow,
    inbound: { text: 'jeda' },
    deps: makeDeps([], scheduled)
  });

  assert.equal(result.outcome, 'waiting');
  assert.equal(result.state.pendingWait, 'n2');
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].socket, 'out');
  assert.equal(scheduled[0].delayMs, 2000);
});

test('wait input melanjutkan ke cabang reply saat resume', async () => {
  const sent: OutboundMessage[] = [];
  const flow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'waitInputNode', { timeoutSeconds: 60 }),
      node('n3', 'sendTextNode', { body: 'terima kasih' }),
      node('n4', 'sendTextNode', { body: 'timeout' })
    ],
    [edge('e1', 'n1', 'out', 'n2'), edge('e2', 'n2', 'reply', 'n3'), edge('e3', 'n2', 'timeoutOut', 'n4')]
  );

  const result = await executeFlow({
    state: makeState({ cursor: 'n2', pendingWait: 'n2' }),
    flow,
    inbound: { text: 'jawaban pelanggan' },
    resumeSocket: 'reply',
    deps: makeDeps(sent, [])
  });

  assert.equal(result.outcome, 'done');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, 'terima kasih');
});

test('keyword dan switch memilih cabang yang tepat', async () => {
  const matched: OutboundMessage[] = [];
  const keywordFlow = makeFlow(
    [
      node('n1', 'keywordMatchNode', { keyword: 'PROMO', matchMode: 'contains' }),
      node('n2', 'sendTextNode', { body: 'matched' }),
      node('n3', 'sendTextNode', { body: 'unmatched' })
    ],
    [edge('e1', 'n1', 'matched', 'n2'), edge('e2', 'n1', 'unmatched', 'n3')]
  );

  await executeFlow({
    state: makeState(),
    flow: keywordFlow,
    inbound: { text: 'ada promo dong' },
    deps: makeDeps(matched, [])
  });

  assert.equal(matched.length, 1);
  assert.equal(matched[0].body, 'matched');

  const switched: OutboundMessage[] = [];
  const switchFlow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'switchNode', { target: '{{lastReply}}', caseA: '1', caseB: '2' }),
      node('n3', 'sendTextNode', { body: 'case b' }),
      node('n4', 'sendTextNode', { body: 'default' })
    ],
    [edge('e1', 'n1', 'out', 'n2'), edge('e2', 'n2', 'caseB', 'n3'), edge('e3', 'n2', 'default', 'n4')]
  );

  await executeFlow({
    state: makeState({ vars: { phone: '628000000000', lastReply: '2' } }),
    flow: switchFlow,
    inbound: { text: '2' },
    deps: makeDeps(switched, [])
  });

  assert.equal(switched.length, 1);
  assert.equal(switched[0].body, 'case b');
});

test('assign agent menghentikan alur sebagai handoff', async () => {
  const flow = makeFlow(
    [node('n1', 'onMessageNode'), node('n2', 'assignAgentNode', { department: 'Sales' })],
    [edge('e1', 'n1', 'out', 'n2')]
  );

  const result = await executeFlow({
    state: makeState(),
    flow,
    inbound: { text: 'mau bicara dengan orang' },
    deps: makeDeps([], [])
  });

  assert.equal(result.outcome, 'handoff');
  assert.equal(result.reason, 'agent_handoff');
});

test('appointment node membuat janji saat slot tersedia', async () => {
  const sent: OutboundMessage[] = [];
  const events: string[] = [];
  const deps: ExecutorDeps = {
    ...makeDeps(sent, []),
    capi: async ({ event }) => {
      events.push(event);
    }
  };

  const flow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'appointmentNode', { requestedAt: new Date(2026, 0, 1, 10, 0, 0).toISOString() }),
      node('n3', 'sendTextNode', { body: 'janji dibuat' })
    ],
    [edge('e1', 'n1', 'out', 'n2'), edge('e2', 'n2', 'created', 'n3')]
  );

  const result = await executeFlow({
    state: makeState(),
    flow,
    inbound: { text: 'saya mau janji jam 10' },
    deps
  });

  assert.equal(result.outcome, 'done');
  assert.equal(result.state.vars.appointmentStatus, 'created');
  assert.deepEqual(events, ['Schedule']);
  assert.equal(sent[0]?.body, 'janji dibuat');
});

test('appointment node menolak slot di luar jam operasional', async () => {
  const sent: OutboundMessage[] = [];
  const deps: ExecutorDeps = {
    ...makeDeps(sent, []),
    officeHours: async () => ({ enabled: true, startHour: 9, endHour: 18 })
  };

  const flow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'appointmentNode', { requestedAt: new Date(2026, 0, 1, 20, 0, 0).toISOString() }),
      node('n3', 'sendTextNode', { body: 'diluar jam' })
    ],
    [edge('e1', 'n1', 'out', 'n2'), edge('e2', 'n2', 'unavailable', 'n3')]
  );

  const result = await executeFlow({
    state: makeState(),
    flow,
    inbound: { text: 'janji jam 8 malam' },
    deps
  });

  assert.equal(result.state.vars.appointmentStatus, 'unavailable');
  assert.equal(sent[0]?.body, 'diluar jam');
});

test('ai agent memakai model override dari node', async () => {
  const sent: OutboundMessage[] = [];
  const models: Array<string | undefined> = [];
  const deps: ExecutorDeps = {
    ...makeDeps(sent, []),
    ai: async (input) => {
      models.push(input.model);
      return 'balasan';
    }
  };

  const flow = makeFlow(
    [
      node('n1', 'onMessageNode'),
      node('n2', 'aiAgentNode', { systemPrompt: 'Jadi sales ramah', model: 'deepseek-v4.1-flash' })
    ],
    [edge('e1', 'n1', 'out', 'n2')]
  );

  await executeFlow({ state: makeState(), flow, inbound: { text: 'halo' }, deps });

  assert.deepEqual(models, ['deepseek-v4.1-flash']);
  assert.equal(sent[0]?.body, 'balasan');
});

test('helper ekspresi dan template aman', async () => {
  assert.equal(await evaluateComparison('10', '>=', '5'), true);
  assert.equal(await evaluateComparison('2', '>', '5'), false);
  assert.equal(await evaluateComparison('x', 'DROP TABLE', 'y'), false);
  assert.equal(evaluateContains('halo promo', 'promo'), true);
  assert.equal(evaluateEmpty('  '), true);
  assert.equal(evaluateEmpty('ada'), false);
  assert.equal(safeRegex('^(a+)+$'), null);
  const promo = safeRegex('promo');
  assert.ok(promo);
  assert.equal(promo.test('PROMO 2026'), true);
  assert.equal(resolveTemplate('{{user.name}}', { user: { name: 'Rani' } }), 'Rani');
  assert.equal(resolveText('Hai {{user.name}}!', { user: { name: 'Rani' } }), 'Hai Rani!');
});
