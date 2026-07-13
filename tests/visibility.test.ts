import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  visibilityQuestions,
  checkVisibility,
  questionResultSchema,
} from '../src/lib/visibility.ts';
import { Llm } from '../src/lib/openai.ts';

const config = {
  apiKey: 'k',
  model: 'gpt-5.6',
  priceInPerM: 1,
  priceOutPerM: 1,
  priceWebSearchPerCall: 0.01,
  maxRunCostUsd: 10,
};

test('exactly five questions substitute city, vertical, and business', () => {
  const questions = visibilityQuestions('Acme HVAC', 'hvac', 'Plano, TX');
  assert.equal(questions.length, 5);
  assert.ok(questions.some((question) => question.includes('Plano, TX')));
  assert.ok(questions.some((question) => question.includes('my AC fixed today')));
  assert.ok(questions.some((question) => question.includes('Acme HVAC')));
});

test('visibility schema limits winners to five exact business names', () => {
  const winners = questionResultSchema.properties.winners;
  assert.equal(winners.maxItems, 5);
  assert.match(winners.description, /business names only/i);
  assert.match(winners.items.description, /no phone numbers/i);
});

test('checkVisibility runs one web-search call per question', async () => {
  let calls = 0;
  const llm = new Llm(config, async () => {
    calls += 1;
    return {
      output_text: JSON.stringify({
        appeared: calls === 1,
        winners: ['Other Co'],
        sources: ['maps.google.com'],
        missing: 'few recent reviews',
      }),
      usage: { input_tokens: 5, output_tokens: 5 },
    };
  });
  const visibility = await checkVisibility(
    llm,
    { name: 'Acme HVAC', url: 'https://acme.example', city: 'Plano, TX', vertical: 'hvac' },
    { services: [], serviceArea: null, booking: false, reviews: [], signals: [] },
  );
  assert.equal(calls, 5);
  assert.equal(visibility.engine, 'gpt-5.6-web-search');
  assert.equal(visibility.questions.length, 5);
  assert.equal(visibility.questions[0]?.appeared, true);
  assert.equal(visibility.questions[1]?.appeared, false);
});

test('falls back to the researched service area when no city is given', async () => {
  const llm = new Llm(config, async () => ({
    output_text: JSON.stringify({ appeared: false, winners: [], sources: [], missing: '' }),
    usage: { input_tokens: 1, output_tokens: 1 },
  }));
  const visibility = await checkVisibility(
    llm,
    { name: 'Acme', url: 'https://acme.example', vertical: 'hvac' },
    { services: [], serviceArea: 'Frisco, TX', booking: false, reviews: [], signals: [] },
  );
  assert.ok(visibility.questions[0]?.q.includes('Frisco, TX'));
});

test('cleans verbose winner entries and citation markup before storing visibility', async () => {
  const llm = new Llm(config, async () => ({
    output_text: JSON.stringify({
      appeared: true,
      winners: [
        'Acme HVAC: Call 555-0100. It offers same-day service. ([acme.example](https://acme.example))',
        'Other **Heating** Co',
      ],
      sources: ['[Google Maps](https://maps.google.com)'],
      missing: 'See [BBB](https://bbb.org/acme) for complaint details.',
    }),
    usage: { input_tokens: 1, output_tokens: 1 },
  }));

  const visibility = await checkVisibility(
    llm,
    { name: 'Acme HVAC', url: 'https://acme.example', city: 'Plano, TX', vertical: 'hvac' },
    { services: [], serviceArea: null, booking: false, reviews: [], signals: [] },
  );

  assert.deepEqual(visibility.questions[0]?.winners, ['Acme HVAC', 'Other Heating Co']);
  assert.deepEqual(visibility.questions[0]?.sources, ['Google Maps']);
  assert.equal(visibility.questions[0]?.missing, 'See BBB for complaint details.');
});
