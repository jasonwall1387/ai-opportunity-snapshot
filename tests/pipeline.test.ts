import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../src/lib/pipeline.ts';
import { MemoryStore } from '../src/lib/store.ts';
import { Llm } from '../src/lib/openai.ts';
import type { LlmRequest } from '../src/lib/openai.ts';

const config = {
  apiKey: 'k',
  model: 'gpt-5.6',
  priceInPerM: 1,
  priceOutPerM: 1,
  priceWebSearchPerCall: 0.01,
  maxRunCostUsd: 10,
};

const research = {
  services: ['ac repair'],
  serviceArea: 'Plano, TX',
  booking: false,
  reviews: [],
  signals: [],
};
const visibilityResult = {
  appeared: false,
  winners: ['W'],
  sources: ['s.com'],
  missing: 'reviews',
};
const analysis = {
  score: {
    total: 42,
    sub: { visibility: 40, leadCapture: 30, reviews: 50, responsiveness: 45, automation: 20 },
  },
  opportunities: Array.from({ length: 5 }, (_, index) => ({
    title: `Opp ${index}`,
    description: 'A practical improvement.',
    effort: 'low',
    impact: 'high',
  })),
  firstAutomation: { title: 'Missed-call text-back', why: 'It addresses a clear gap.' },
};

function schemaName(request: LlmRequest): string {
  const format = request.text?.format;
  if (format?.type !== 'json_schema') throw new Error('structured format missing');
  return format.name;
}

function happyTransport() {
  return async (request: LlmRequest) => {
    const name = schemaName(request);
    const body =
      name === 'business_research'
        ? research
        : name === 'visibility_check'
          ? visibilityResult
          : analysis;
    return { output_text: JSON.stringify(body), usage: { input_tokens: 10, output_tokens: 10 } };
  };
}

const input = {
  name: 'Acme HVAC',
  url: 'https://acme.example',
  city: 'Plano, TX',
  vertical: 'hvac',
};
const failingFetch: typeof fetch = async () => new Response('x', { status: 500 });

test('happy path assembles a full snapshot and done status', async () => {
  const store = new MemoryStore();
  const snapshot = await runPipeline(input, 'acme-abc123', {
    store,
    llm: new Llm(config, happyTransport()),
    fetchImpl: failingFetch,
  });
  assert.ok(snapshot);
  assert.equal(snapshot.slug, 'acme-abc123');
  assert.equal(snapshot.score.total, 42);
  assert.equal(snapshot.score.band, 'Findable but manual');
  assert.equal(snapshot.meta.model, 'gpt-5.6');
  assert.equal(snapshot.meta.limitedSiteData, true);
  assert.equal(snapshot.visibility.questions.length, 5);
  assert.ok(snapshot.roi.lowMonthly > 0);
  assert.equal((await store.getStatus('acme-abc123'))?.stage, 'done');
  assert.deepEqual(await store.getSnapshot('acme-abc123'), snapshot);
});

test('research failure degrades with a warning and still completes', async () => {
  let researchCalls = 0;
  const transport = async (request: LlmRequest) => {
    const name = schemaName(request);
    if (name === 'business_research') {
      researchCalls += 1;
      throw new Error('search down');
    }
    const body = name === 'visibility_check' ? visibilityResult : analysis;
    return { output_text: JSON.stringify(body), usage: { input_tokens: 1, output_tokens: 1 } };
  };
  const store = new MemoryStore();
  const snapshot = await runPipeline(input, 's1', {
    store,
    llm: new Llm(config, transport),
    fetchImpl: failingFetch,
  });
  assert.ok(snapshot);
  assert.equal(researchCalls, 2, 'wrapper retries once');
  assert.ok(snapshot.meta.warnings.some((warning) => warning.includes('research')));
  assert.equal((await store.getStatus('s1'))?.stage, 'done');
});

test('analysis failure ends in error status and returns null', async () => {
  const transport = async (request: LlmRequest) => {
    const name = schemaName(request);
    if (name === 'snapshot_analysis') throw new Error('nope');
    const body = name === 'business_research' ? research : visibilityResult;
    return { output_text: JSON.stringify(body), usage: { input_tokens: 1, output_tokens: 1 } };
  };
  const store = new MemoryStore();
  const snapshot = await runPipeline(input, 's2', {
    store,
    llm: new Llm(config, transport),
    fetchImpl: failingFetch,
  });
  assert.equal(snapshot, null);
  const status = await store.getStatus('s2');
  assert.equal(status?.stage, 'error');
  assert.ok(status?.error && status.error.length > 0);
});
