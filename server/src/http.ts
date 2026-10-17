import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { HttpResult } from './types.js';

const MAX_BODY_CHARS = 200_000;

function isPrivateIp(address: string): boolean {
  if (address === '::1' || address === '::') return true;

  const ipv4 = address.startsWith('::ffff:') ? address.slice(7) : address;
  if (isIP(ipv4) !== 4) return false;

  const [a, b] = ipv4.split('.').map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'https:') {
    throw new Error('Hanya HTTPS yang diizinkan');
  }
  if (url.username || url.password) {
    throw new Error('URL tidak boleh memuat kredensial');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Host tidak diizinkan');
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true });

  if (addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('Host mengarah ke jaringan privat');
  }
}

export async function safeHttpRequest(input: {
  method: string;
  url: string;
  body?: string;
}): Promise<HttpResult> {
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return { status: 0, data: { error: 'invalid_url' } };
  }

  try {
    await assertPublicUrl(url);
  } catch (error) {
    return { status: 0, data: { error: (error as Error).message } };
  }

  const method = ['GET', 'POST', 'PUT', 'DELETE'].includes(input.method.toUpperCase())
    ? input.method.toUpperCase()
    : 'GET';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' || method === 'DELETE' ? undefined : input.body || undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000)
    });

    const raw = await response.text();
    let data: unknown = raw.slice(0, MAX_BODY_CHARS);

    try {
      data = JSON.parse(raw);
    } catch {
      data = raw.slice(0, MAX_BODY_CHARS);
    }

    return { status: response.status, data };
  } catch (error) {
    return { status: 0, data: { error: (error as Error).message } };
  }
}
