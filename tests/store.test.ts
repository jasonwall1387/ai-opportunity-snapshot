import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore, KvStore } from '../src/lib/store.ts';
import type { Snapshot, StatusRecord } from '../src/lib/types.ts';

const status: StatusRecord = { stage: 'queued', updatedAt: new Date(0).toISOString() };

const snapshot: Snapshot = {
  slug: 'a-1',
  business: { name: 'Acme', url: 'https://acme.example', vertical: 'general' },
  createdAt: new Date(0).toISOString(),
  score: {
    total: 40,
    band: 'Basic presence',
    sub: { visibility: 40, leadCapture: 40, reviews: 40, responsiveness: 40, automation: 40 },
  },
  research: { services: [], serviceArea: null, booking: false, reviews: [], signals: [] },
  visibility: { engine: 'gpt-5.6-web-search', questions: [] },
  opportunities: [],
  firstAutomation: { title: 'Start', why: 'Reason' },
  roi: { lowMonthly: 0, highMonthly: 0, capped: false, assumptions: {} },
  meta: {
    model: 'gpt-5.6',
    usage: { inputTokens: 0, outputTokens: 0, estCostUsd: 0 },
    warnings: [],
    limitedSiteData: false,
    durationMs: 1,
  },
};

test('MemoryStore round-trips snapshot and status', async () => {
  const store = new MemoryStore();
  await store.putStatus('a-1', status);
  assert.deepEqual(await store.getStatus('a-1'), status);
  assert.equal(await store.getSnapshot('a-1'), null);
  await store.putSnapshot('a-1', snapshot);
  assert.deepEqual(await store.getSnapshot('a-1'), snapshot);
});

test('KvStore uses snap and status prefixes with a status TTL', async () => {
  const puts: Array<{ key: string; options?: { expirationTtl?: number } }> = [];
  const fakeKv = {
    get: async (key: string) => (key === 'snap:x' ? JSON.stringify({ ...snapshot, slug: 'x' }) : null),
    put: async (key: string, _value: string, options?: { expirationTtl?: number }) => {
      puts.push({ key, options });
    },
  };
  const store = new KvStore(fakeKv);
  await store.putSnapshot('x', { ...snapshot, slug: 'x' });
  await store.putStatus('x', status);
  assert.equal((await store.getSnapshot('x'))?.slug, 'x');
  assert.equal(puts[0]?.key, 'snap:x');
  assert.equal(puts[0]?.options?.expirationTtl, undefined);
  assert.equal(puts[1]?.key, 'status:x');
  assert.equal(puts[1]?.options?.expirationTtl, 3600);
});
