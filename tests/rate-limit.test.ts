import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../src/lib/rate-limit.ts';

function fakeKv() {
  const values = new Map<string, string>();
  const keys: string[] = [];
  return {
    keys,
    get: async (key: string) => values.get(key) ?? null,
    put: async (key: string, value: string) => {
      keys.push(key);
      values.set(key, value);
    },
  };
}

test('allows up to five runs per identity per hour, then blocks', async () => {
  const kv = fakeKv();
  const now = () => new Date('2026-07-13T10:15:00Z');
  for (let index = 0; index < 5; index += 1) {
    assert.equal(await checkRateLimit(kv, '1.2.3.4', now), true, `run ${index + 1}`);
  }
  assert.equal(await checkRateLimit(kv, '1.2.3.4', now), false);
  assert.ok(kv.keys.every((key) => !key.includes('1.2.3.4')), 'raw IP must not be stored');
});

test('different identity or hour resets the count', async () => {
  const kv = fakeKv();
  const firstHour = () => new Date('2026-07-13T10:59:00Z');
  const nextHour = () => new Date('2026-07-13T11:01:00Z');
  for (let index = 0; index < 5; index += 1) await checkRateLimit(kv, 'a', firstHour);
  assert.equal(await checkRateLimit(kv, 'a', firstHour), false);
  assert.equal(await checkRateLimit(kv, 'b', firstHour), true);
  assert.equal(await checkRateLimit(kv, 'a', nextHour), true);
});
