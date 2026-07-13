import type { Research, SnapshotInput, Visibility, VisibilityQuestion } from './types.ts';
import type { Llm } from './openai.ts';
import { problemPhraseFor, verticalRow } from './roi.ts';

export const questionResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    appeared: { type: 'boolean' },
    winners: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
    missing: { type: 'string' },
  },
  required: ['appeared', 'winners', 'sources', 'missing'],
} as const;

export function visibilityQuestions(name: string, vertical: string, city: string): string[] {
  const label = verticalRow(vertical).label.toLowerCase();
  const problem = problemPhraseFor(vertical);
  return [
    `Who is the best ${label} company in ${city}?`,
    `I need ${problem} in ${city}. Who should I call?`,
    `Recommend a few ${label} companies near ${city} with good reviews.`,
    `Is ${name} in ${city} reputable? What do people say about them?`,
    `Which ${label} companies in ${city} let me book online?`,
  ];
}

const instructions = (name: string) => `You are simulating what a consumer AI assistant answers.
First, use web search and answer the user's question the way a helpful consumer assistant would, naming real businesses. Then report structured results about that answer:
- appeared: did "${name}" appear anywhere in your answer? Match the exact business, not lookalikes.
- winners: the businesses you named (max 5)
- sources: domains you relied on (max 5)
- missing: one short factual sentence on what "${name}" lacks that the winners have, based on what you saw
Use plain language and no em dashes.`;

export async function checkVisibility(
  llm: Llm,
  input: SnapshotInput,
  research: Research,
): Promise<Visibility> {
  const city = input.city ?? research.serviceArea ?? 'their local service area';
  const vertical = input.vertical ?? 'general';
  const questions = visibilityQuestions(input.name, vertical, city);
  const results: VisibilityQuestion[] = [];

  for (const question of questions) {
    const result = await llm.json<Omit<VisibilityQuestion, 'q'>>({
      instructions: instructions(input.name),
      input: question,
      schemaName: 'visibility_check',
      schema: questionResultSchema,
      webSearch: true,
    });
    results.push({ q: question, ...result });
  }

  return { engine: 'gpt-5.6-web-search', questions: results };
}
