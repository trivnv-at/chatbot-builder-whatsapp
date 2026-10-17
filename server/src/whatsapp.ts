import { config } from './config.js';
import type { OutboundMessage } from './types.js';

const GRAPH_VERSION = 'v21.0';

function buildPayload(message: OutboundMessage): Record<string, unknown> {
  if (message.kind === 'buttons') {
    return {
      messaging_product: 'whatsapp',
      to: message.to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: message.body ?? '' },
        action: {
          buttons: (message.buttons ?? []).slice(0, 3).map((title, index) => ({
            type: 'reply',
            reply: { id: `btn${index + 1}`, title: title.slice(0, 20) }
          }))
        }
      }
    };
  }

  if (message.kind === 'list') {
    return {
      messaging_product: 'whatsapp',
      to: message.to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: message.body ?? '' },
        action: {
          button: (message.listLabel ?? 'Pilih').slice(0, 20),
          sections: [
            {
              title: 'Menu',
              rows: (message.rows ?? []).slice(0, 10).map((title, index) => ({
                id: `row${index + 1}`,
                title: title.slice(0, 24)
              }))
            }
          ]
        }
      }
    };
  }

  if (message.kind === 'media' && message.media) {
    const type = message.media.type || 'document';
    return {
      messaging_product: 'whatsapp',
      to: message.to,
      type,
      [type]: {
        link: message.media.url,
        ...(message.media.caption ? { caption: message.media.caption } : {})
      }
    };
  }

  return {
    messaging_product: 'whatsapp',
    to: message.to,
    type: 'text',
    text: { body: message.body ?? '' }
  };
}

export async function sendWhatsApp(message: OutboundMessage): Promise<void> {
  const token = config.WHATSAPP_TOKEN;
  const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.info('[whatsapp:mock]', JSON.stringify({ to: message.to, kind: message.kind }));
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildPayload(message)),
      signal: AbortSignal.timeout(10_000)
    }
  );

  if (!response.ok) {
    throw new Error(`WhatsApp API error ${response.status}`);
  }
}
