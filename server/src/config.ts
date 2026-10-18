import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  FLOW_API_KEY: z.string().min(8).default('change-me-please'),
  WEBHOOK_APP_SECRET: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  AI_CONFIG_SECRET: z.string().min(16).default('dev-ai-config-secret-key-32bytes'),
  DEFAULT_FLOW_ID: z.string().optional(),
  CONVERSATION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  MAX_STEPS: z.coerce.number().int().positive().default(40),
  MAX_NODE_VISITS: z.coerce.number().int().positive().default(12)
});

export const config = envSchema.parse(process.env);
