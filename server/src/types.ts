export type SocketType = 'flow' | 'string' | 'boolean' | 'number' | 'json' | 'array';

export interface FlowNode {
  id: string;
  type: string;
  label?: string;
  x?: number;
  y?: number;
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface Flow {
  id: string;
  name?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ConversationState {
  flowId: string;
  phone: string;
  cursor: string | null;
  pendingWait: string | null;
  vars: Record<string, unknown>;
  visits: Record<string, number>;
  steps: number;
  handoff: boolean;
  updatedAt: string;
}

export interface OutboundMessage {
  to: string;
  kind: 'text' | 'buttons' | 'list' | 'media';
  body?: string;
  buttons?: string[];
  listLabel?: string;
  rows?: string[];
  media?: { url: string; type: string; caption?: string };
}

export interface InboundMessage {
  text: string;
}

export interface HttpResult {
  status: number;
  data: unknown;
}

export interface OfficeHours {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface ExecutorDeps {
  send: (message: OutboundMessage) => Promise<void>;
  schedule: (state: ConversationState, delayMs: number, socket: string | null) => Promise<void>;
  http: (input: { method: string; url: string; body?: string }) => Promise<HttpResult>;
  ai: (input: { prompt: string; user: string; model?: string }) => Promise<string>;
  capi: (input: { phone: string; event: string; value?: number }) => Promise<void>;
  officeHours?: () => Promise<OfficeHours>;
}

export type ExecutionOutcome = 'done' | 'waiting' | 'handoff' | 'stopped';

export interface ExecutionResult {
  state: ConversationState;
  outcome: ExecutionOutcome;
  reason?: string;
}
