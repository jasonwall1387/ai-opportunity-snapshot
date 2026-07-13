import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Llm, llmConfigFromEnv, CostCeilingError } from '../src/lib/openai.ts';
import type { LlmRequest } from '../src/lib/openai.ts';

const config = {
  apiKey: 'test',
  model: 'gpt-5.6',
  priceInPerM: 2.5,
  priceOutPerM: 15,
  priceWebSearchPerCall: 0.01,
  maxRunCostUsd: 1.5,
};

function fakeResponse(json: unknown, inputTokens = 1000, outputTokens = 500) {
  return {
    output_text: JSON.stringify(json),
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

test('llmConfigFromEnv applies current defaults', () => {
  const result = llmConfigFromEnv({ OPENAI_API_KEY: 'k' });
  assert.equal(result.model, 'gpt-5.6');
  assert.equal(result.priceInPerM, 5);
  assert.equal(result.priceOutPerM, 30);
  assert.equal(result.priceWebSearchPerCall, 0.01);
  assert.equal(result.maxRunCostUsd, 1.5);
});

test('llmConfigFromEnv throws without a key', () => {
  assert.throws(() => llmConfigFromEnv({}), /OPENAI_API_KEY/);
});

test('json parses output and accumulates usage', async () => {
  const llm = new Llm(config, async () => fakeResponse({ ok: true }));
  const output = await llm.json<{ ok: boolean }>({
    instructions: 'i',
    input: 'x',
    schemaName: 't',
    schema: { type: 'object' },
  });
  assert.deepEqual(output, { ok: true });
  assert.equal(llm.model(), 'gpt-5.6');
  assert.equal(llm.usage().inputTokens, 1000);
  assert.ok(llm.usage().estCostUsd > 0);
});

test('web search is required and its tool-call price is tracked', async () => {
  let request: LlmRequest | undefined;
  const llm = new Llm(config, async (captured) => {
    request = captured;
    return fakeResponse({ ok: true }, 0, 0);
  });
  await llm.json({
    instructions: 'i',
    input: 'x',
    schemaName: 't',
    schema: { type: 'object' },
    webSearch: true,
  });
  assert.deepEqual(request?.tools, [{ type: 'web_search' }]);
  assert.equal(request?.tool_choice, 'required');
  assert.equal(llm.usage().estCostUsd, 0.01);
});

test('retries once on a server failure then succeeds', async () => {
  let calls = 0;
  const llm = new Llm(config, async () => {
    calls += 1;
    if (calls === 1) throw new Error('boom 500');
    return fakeResponse({ ok: 1 });
  });
  await llm.json({ instructions: 'i', input: 'x', schemaName: 't', schema: {} });
  assert.equal(calls, 2);
});

test('does not retry a client failure', async () => {
  let calls = 0;
  const llm = new Llm(config, async () => {
    calls += 1;
    throw new Error('request failed 400');
  });
  await assert.rejects(
    llm.json({ instructions: 'i', input: 'x', schemaName: 't', schema: {} }),
    /400/,
  );
  assert.equal(calls, 1);
});

test('throws CostCeilingError when estimated cost exceeds the ceiling', async () => {
  const llm = new Llm(
    { ...config, maxRunCostUsd: 0.001 },
    async () => fakeResponse({ ok: 1 }, 1_000_000, 1_000_000),
  );
  await assert.rejects(
    llm.json({ instructions: 'i', input: 'x', schemaName: 't', schema: {} }),
    CostCeilingError,
  );
});
