import { createHash } from 'node:crypto';
import { config } from './config.js';

export async function sendCapiEvent(input: {
  phone: string;
  event: string;
  value?: number;
}): Promise<void> {
  const token = config.WHATSAPP_TOKEN;
  if (!token) {
    console.info('[capi:mock]', JSON.stringify({ event: input.event, value: input.value }));
    return;
  }

  const hashedPhone = createHash('sha256').update(input.phone.replace(/\D/g, '')).digest('hex');

  const response = await fetch('https://graph.facebook.com/v21.0/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        {
          event_name: input.event,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'business_messaging',
          user_data: { ph: [hashedPhone] },
          custom_data: input.value === undefined ? undefined : { value: input.value, currency: 'IDR' }
        }
      ],
      access_token: token
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`CAPI error ${response.status}`);
  }
}
