import { config } from '../config.js';
import { resolveTemplate, resolveText } from './context.js';
import { evaluateContains, evaluateComparison, evaluateEmpty, safeRegex } from './expression.js';
import { TRIGGER_TYPES } from './node-defs.js';
import type {
  ConversationState,
  ExecutionOutcome,
  ExecutionResult,
  ExecutorDeps,
  Flow,
  FlowNode,
  InboundMessage
} from '../types.js';

const POSITIVE_WORDS = ['terima kasih', 'bagus', 'puas', 'suka', 'mantap', 'senang', 'oke', 'ok'];
const NEGATIVE_WORDS = ['marah', 'kecewa', 'buruk', 'jelek', 'lambat', 'tipu', 'batal', 'komplain'];

interface ExecuteInput {
  state: ConversationState;
  flow: Flow;
  inbound: InboundMessage;
  resumeSocket?: string | null;
  deps: ExecutorDeps;
}

interface NodeResult {
  socket?: string | null;
  wait?: { delayMs: number; socket: string };
  stop?: boolean;
  outcome?: ExecutionOutcome;
  reason?: string;
}

function finish(
  state: ConversationState,
  outcome: ExecutionOutcome,
  reason?: string
): ExecutionResult {
  state.updatedAt = new Date().toISOString();
  return { state, outcome, reason };
}

async function runNode(
  node: FlowNode,
  inbound: InboundMessage,
  state: ConversationState,
  deps: ExecutorDeps
): Promise<NodeResult> {
  const data = node.data ?? {};
  const vars = state.vars;
  const text = inbound.text;

  switch (node.type) {
    case 'keywordMatchNode': {
      const keyword = resolveText(data.keyword, vars);
      const mode = resolveText(data.matchMode, vars) || 'contains';
      let matched = false;

      if (mode === 'regex') {
        const pattern = safeRegex(keyword);
        matched = pattern ? pattern.test(text) : false;
      } else if (mode === 'exact') {
        matched = text.trim().toLowerCase() === keyword.trim().toLowerCase();
      } else {
        matched = keyword.length > 0 && text.toLowerCase().includes(keyword.toLowerCase());
      }

      if (matched) vars.matchedTerm = keyword;
      return { socket: matched ? 'matched' : 'unmatched' };
    }

    case 'conditionNode': {
      const left = resolveTemplate(data.operandA, vars);
      const right = resolveTemplate(data.operandB, vars);
      const operator = resolveText(data.operator, vars) || '==';

      let passed = false;
      if (operator === 'contains') passed = evaluateContains(left, right);
      else if (operator === 'is_empty') passed = evaluateEmpty(left);
      else passed = await evaluateComparison(left, operator, right);

      return { socket: passed ? 'true' : 'false' };
    }

    case 'switchNode': {
      const target = resolveText(data.target, vars).trim().toLowerCase();
      const cases: Array<[string, string]> = [
        ['caseA', 'caseA'],
        ['caseB', 'caseB'],
        ['caseC', 'caseC']
      ];

      for (const [key, socket] of cases) {
        const value = resolveText(data[key], vars).trim().toLowerCase();
        if (target.length > 0 && target === value) return { socket };
      }

      return { socket: 'default' };
    }

    case 'delayNode': {
      const seconds = Math.max(1, Number(data.duration ?? 2.5));
      return { wait: { delayMs: Math.round(seconds * 1000), socket: 'out' } };
    }

    case 'waitInputNode': {
      const seconds = Math.max(5, Number(data.timeoutSeconds ?? 300));
      return { wait: { delayMs: seconds * 1000, socket: 'timeoutOut' } };
    }

    case 'sendTextNode': {
      await deps.send({ to: state.phone, kind: 'text', body: resolveText(data.body, vars) });
      return { socket: 'out' };
    }

    case 'sendButtonsNode': {
      const buttons = [data.btn1, data.btn2, data.btn3]
        .map((value) => resolveText(value, vars))
        .filter(Boolean);
      await deps.send({
        to: state.phone,
        kind: 'buttons',
        body: resolveText(data.header, vars),
        buttons
      });
      const seconds = Math.max(5, Number(data.timeoutSeconds ?? 300));
      return { wait: { delayMs: seconds * 1000, socket: 'timeout' } };
    }

    case 'sendListNode': {
      const rows = Array.isArray(data.rows)
        ? (data.rows as unknown[]).map((row) => resolveText(row, vars)).filter(Boolean)
        : [];
      await deps.send({
        to: state.phone,
        kind: 'list',
        body: resolveText(data.title, vars),
        listLabel: resolveText(data.buttonLabel, vars),
        rows
      });
      return { wait: { delayMs: 300_000, socket: 'selected' } };
    }

    case 'sendMediaNode': {
      const caption = resolveText(data.caption, vars);
      await deps.send({
        to: state.phone,
        kind: 'media',
        body: caption,
        media: {
          url: resolveText(data.url, vars),
          type: resolveText(data.mediaType, vars) || 'document',
          caption
        }
      });
      return { socket: 'out' };
    }

    case 'updateStageNode': {
      vars.leadStage = resolveText(data.stageId, vars);
      return { socket: 'out' };
    }

    case 'customFieldNode': {
      const field = resolveText(data.fieldName, vars);
      if (field) vars[`custom.${field}`] = resolveTemplate(data.fieldValue, vars);
      return { socket: 'out' };
    }

    case 'leadScoreNode': {
      const delta = Number(data.scoreValue ?? 0);
      const current = Number(vars.leadScore ?? 0);
      vars.leadScore = current + delta;
      return { socket: 'out' };
    }

    case 'assignAgentNode': {
      state.handoff = true;
      return { stop: true, outcome: 'handoff', reason: 'agent_handoff' };
    }

    case 'sentimentNode': {
      const source = resolveText(data.inputText, vars) || text;
      const lower = source.toLowerCase();
      const score = POSITIVE_WORDS.some((word) => lower.includes(word))
        ? 1
        : NEGATIVE_WORDS.some((word) => lower.includes(word))
          ? -1
          : 0;
      vars.sentimentScore = score;
      return { socket: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral' };
    }

    case 'aiAgentNode': {
      const reply = await deps.ai({
        prompt: resolveText(data.systemPrompt, vars),
        user: text
      });
      vars.aiResponse = reply;
      await deps.send({ to: state.phone, kind: 'text', body: reply });
      return { socket: 'out' };
    }

    case 'httpRequestNode': {
      const result = await deps.http({
        method: resolveText(data.method, vars) || 'GET',
        url: resolveText(data.url, vars),
        body: resolveText(data.headersBody, vars)
      });
      vars.statusCode = result.status;
      vars.responseData = result.data;
      return { socket: result.status >= 200 && result.status < 300 ? 'success' : 'error' };
    }

    case 'capiNode': {
      const event = resolveText(data.eventName, vars) || 'Lead';
      const rawValue = resolveTemplate(data.currencyValue, vars);
      const value = rawValue === undefined || rawValue === '' ? undefined : Number(rawValue);
      await deps.capi({ phone: state.phone, event, value });
      return { socket: 'out' };
    }

    default:
      return { socket: 'out' };
  }
}

export async function executeFlow(input: ExecuteInput): Promise<ExecutionResult> {
  const { state, flow, inbound, deps } = input;
  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));

  const findNext = (nodeId: string, socket: string | null): string | null => {
    if (!socket) return null;
    const edge = flow.edges.find((item) => item.source === nodeId && item.sourceHandle === socket);
    return edge ? edge.target : null;
  };

  if (input.resumeSocket && state.cursor) {
    const resumeNodeId = state.cursor;
    state.cursor = findNext(resumeNodeId, input.resumeSocket);
    state.pendingWait = null;
  }

  if (!state.cursor) {
    const targets = new Set(flow.edges.map((edge) => edge.target));
    const start =
      flow.nodes.find((node) => !targets.has(node.id) && TRIGGER_TYPES.has(node.type)) ??
      flow.nodes.find((node) => !targets.has(node.id)) ??
      flow.nodes[0];

    state.cursor = start ? start.id : null;
  }

  while (state.cursor) {
    state.steps += 1;

    if (state.steps > config.MAX_STEPS) {
      state.handoff = true;
      state.pendingWait = null;
      state.cursor = null;
      return finish(state, 'stopped', 'step_limit');
    }

    const node = nodesById.get(state.cursor);
    if (!node) {
      state.cursor = null;
      return finish(state, 'stopped', 'missing_node');
    }

    state.visits[node.id] = (state.visits[node.id] ?? 0) + 1;
    if (state.visits[node.id] > config.MAX_NODE_VISITS) {
      state.handoff = true;
      state.pendingWait = null;
      state.cursor = null;
      return finish(state, 'handoff', 'loop_guard');
    }

    const result = await runNode(node, inbound, state, deps);

    if (result.stop) {
      state.cursor = null;
      state.pendingWait = null;
      return finish(state, result.outcome ?? 'stopped', result.reason);
    }

    if (result.wait) {
      state.cursor = node.id;
      state.pendingWait = node.id;
      await deps.schedule(state, result.wait.delayMs, result.wait.socket);
      return finish(state, 'waiting');
    }

    state.cursor = findNext(node.id, result.socket ?? 'out');
  }

  state.pendingWait = null;
  return finish(state, state.handoff ? 'handoff' : 'done');
}
