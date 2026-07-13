import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runResearch, researchSchema } from '../src/lib/research.ts';
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

const sample = {
  services: ['kitchen remodels'],
  serviceArea: 'Frisco, TX',
  booking: false,
  reviews: [{ platform: 'Google', count: 42, rating: 4.8 }],
  signals: ['no chat widget'],
};

test('schema is strict with every top-level property required', () => {
  assert.equal(researchSchema.additionalProperties, false);
  assert.deepEqual(
    new Set(researchSchema.required),
    new Set(Object.keys(researchSchema.properties)),
  );
});

test('runResearch passes site text and enables web search', async () => {
  let captured: LlmRequest | undefined;
  const llm = new Llm(config, async (request) => {
    captured = request;
    return {
      output_text: JSON.stringify(sample),
      usage: { input_tokens: 10, output_tokens: 10 },
    };
  });
  const output = await runResearch(
    llm,
    { name: 'Acme Remodeling', url: 'https://acme.example', city: 'Frisco', vertical: 'remodeling' },
    { text: 'WE REMODEL KITCHENS', pagesFetched: ['https://acme.example/'], limited: false },
  );
  assert.deepEqual(output, sample);
  assert.ok(Array.isArray(captured?.tools), 'web search tool must be enabled');
  assert.ok(String(captured?.input).includes('WE REMODEL KITCHENS'));
  assert.ok(String(captured?.input).includes('Acme Remodeling'));
});

test('runResearch works with unavailable site text', async () => {
  const llm = new Llm(config, async () => ({
    output_text: JSON.stringify(sample),
    usage: { input_tokens: 1, output_tokens: 1 },
  }));
  const output = await runResearch(
    llm,
    { name: 'Acme', url: 'https://acme.example' },
    { text: null, pagesFetched: [], limited: true },
  );
  assert.equal(output.booking, false);
});
