import { z } from 'zod';
import { FLOW_OUTPUTS } from '../engine/node-defs.js';

export const MAX_NODES = 300;
export const MAX_EDGES = 600;

const nodeSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.string().min(1).max(60),
    label: z.string().max(160).optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    data: z.record(z.unknown()).default({})
  })
  .strict();

const edgeSchema = z
  .object({
    id: z.string().min(1).max(80),
    source: z.string().min(1).max(80),
    sourceHandle: z.string().min(1).max(60),
    target: z.string().min(1).max(80),
    targetHandle: z.string().min(1).max(60)
  })
  .strict();

export const flowSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().max(160).optional(),
    nodes: z.array(nodeSchema).max(MAX_NODES),
    edges: z.array(edgeSchema).max(MAX_EDGES)
  })
  .strict()
  .superRefine((flow, ctx) => {
    const ids = new Set<string>();

    for (const node of flow.nodes) {
      if (ids.has(node.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Node id duplikat: ${node.id}` });
      }
      ids.add(node.id);

      if (!(node.type in FLOW_OUTPUTS)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Tipe node tidak dikenal: ${node.type}` });
      }
    }

    for (const edge of flow.edges) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge ${edge.id} mengarah ke node yang tidak ada`
        });
        continue;
      }

      const sourceNode = flow.nodes.find((node) => node.id === edge.source);
      const allowed = sourceNode ? FLOW_OUTPUTS[sourceNode.type] ?? [] : [];
      if (!allowed.includes(edge.sourceHandle)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Socket ${edge.sourceHandle} tidak valid untuk node ${edge.source}`
        });
      }
    }
  });

export type ValidatedFlow = z.infer<typeof flowSchema>;
