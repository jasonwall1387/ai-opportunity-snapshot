export interface RateLimitKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const LIMIT = 5;

export async function privacyIdentifier(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export async function checkRateLimit(
  kv: RateLimitKv,
  identity: string,
  now: () => Date = () => new Date(),
): Promise<boolean> {
  const hour = now().toISOString().slice(0, 13);
  const identityHash = await privacyIdentifier(identity);
  const key = `rl:${identityHash}:${hour}`;
  const stored = Number((await kv.get(key)) ?? '0');
  const count = Number.isFinite(stored) && stored >= 0 ? stored : 0;
  if (count >= LIMIT) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 3_600 });
  return true;
}
