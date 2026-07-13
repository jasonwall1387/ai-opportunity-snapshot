import { VERTICALS } from './roi.ts';
import type { SnapshotInput } from './types.ts';

export type InputResult =
  | { ok: true; input: SnapshotInput }
  | { ok: false; error: string };

export function requestIdentity(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown-client';
}

function textField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === 'string' ? record[key].trim() : '';
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const octets = hostname.split('.').map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa')
  ) {
    return false;
  }
  if (host.includes(':')) return false;
  if (/^\d/.test(host)) return !isPrivateIpv4(host);
  return host.includes('.') && !host.startsWith('.') && !host.endsWith('.');
}

export function normalizeSnapshotInput(body: unknown): InputResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Invalid JSON body' };
  }
  const record = body as Record<string, unknown>;
  const name = textField(record, 'name');
  if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    return { ok: false, error: 'Enter a business name between 2 and 80 characters' };
  }

  const rawUrl = textField(record, 'url');
  if (rawUrl.length === 0 || rawUrl.length > 2_048) {
    return { ok: false, error: 'Enter a valid public website URL' };
  }
  let url: URL;
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(rawUrl);
    url = new URL(hasScheme ? rawUrl : `https://${rawUrl}`);
  } catch {
    return { ok: false, error: 'Enter a valid public website URL' };
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    !isPublicHostname(url.hostname)
  ) {
    return { ok: false, error: 'Enter a valid public website URL' };
  }

  const city = textField(record, 'city');
  if (city.length > 100 || /[\u0000-\u001f\u007f]/.test(city)) {
    return { ok: false, error: 'City must be 100 characters or fewer' };
  }
  const vertical = textField(record, 'vertical');
  if (vertical && !VERTICALS.includes(vertical)) {
    return { ok: false, error: 'Choose a supported business type' };
  }

  return {
    ok: true,
    input: {
      name,
      url: url.toString(),
      ...(city ? { city } : {}),
      ...(vertical ? { vertical } : {}),
    },
  };
}
