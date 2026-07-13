import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAnalysis, analysisSchema } from '../src/lib/analyze.ts';
import { Llm } from '../src/lib/openai.ts';
import type { LlmRequest } from '../src/lib/openai.ts';
import { RUBRIC_TEXT } from '../src/lib/bands.ts';

const config = {
  apiKey: 'k',
  model: 'gpt-5.6',
  priceInPerM: 1,
  priceOutPerM: 1,
  priceWebSearchPerCall: 0.01,
  maxRunCostUsd: 10,
};

const sample = {
  score: {
    total: 47,
    sub: { visibility: 40, leadCapture: 30, reviews: 65, responsiveness: 45, automation: 20 },
  },
  opportunities: Array.from({ length: 5 }, (_, index) => ({
    title: `Opportunity ${index + 1}`,
    description: 'A practical next step.',
    effort: 'low',
    impact: 'high',
  })),
  firstAutomation: { title: 'Missed-call text-back', why: 'It addresses the clearest gap.' },
};

test('schema pins exactly five opportunities and is strict', () => {
  assert.equal(analysisSchema.additionalProperties, false);
  assert.equal(analysisSchema.properties.opportunities.minItems, 5);
  assert.equal(analysisSchema.properties.opportunities.maxItems, 5);
});

test('runAnalysis embeds the rubric and both evidence-stage outputs', async () => {
  let captured: LlmRequest | undefined;
  const llm = new Llm(config, async (request) => {
    captured = request;
    return {
      output_text: JSON.stringify(sample),
      usage: { input_tokens: 1, output_tokens: 1 },
    };
  });
  const output = await runAnalysis(
    llm,
    { name: 'Acme', url: 'https://a.example', vertical: 'hvac' },
    {
      services: ['ac repair'],
      serviceArea: 'Plano',
      booking: false,
      reviews: [],
      signals: ['no chat'],
    },
    { engine: 'gpt-5.6-web-search', questions: [] },
  );
  assert.equal(output.score.total, 47);
  assert.ok(String(captured?.instructions).includes(RUBRIC_TEXT));
  assert.ok(String(captured?.input).includes('ac repair'));
  assert.equal(captured?.tools, undefined);
});

test('runAnalysis rejects model-generated dollar figures', async () => {
  const unsafe = structuredClone(sample);
  unsafe.opportunities[0]!.description = 'Recover $50 each month.';
  const llm = new Llm(config, async () => ({
    output_text: JSON.stringify(unsafe),
    usage: { input_tokens: 1, output_tokens: 1 },
  }));
  await assert.rejects(
    runAnalysis(
      llm,
      { name: 'Acme', url: 'https://a.example' },
      { services: [], serviceArea: null, booking: false, reviews: [], signals: [] },
      { engine: 'gpt-5.6-web-search', questions: [] },
    ),
    /dollar/i,
  );
});
