import type { Research, SnapshotInput, Visibility, VisibilityQuestion } from './types.ts';
import type { Llm } from './openai.ts';
import { problemPhraseFor, verticalRow } from './roi.ts';

export const questionResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    appeared: { type: 'boolean' },
    winners: {
      type: 'array',
      description: 'Business names only, with no descriptions or contact details.',
      maxItems: 5,
      items: {
        type: 'string',
        description: 'One exact business name. No phone numbers, URLs, markdown, or commentary.',
      },
    },
    sources: {
      type: 'array',
      description: 'Source domain names only.',
      maxItems: 5,
      items: { type: 'string' },
    },
    missing: {
      type: 'string',
      description: 'One short factual sentence with no URLs or markdown.',
    },
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
- winners: exact business names only (max 5). No phone numbers, descriptions, URLs, markdown, or advice
- sources: domain names only (max 5). No URLs or markdown
- missing: one short factual sentence on what "${name}" lacks that the winners have, based on what you saw. No URLs or markdown
Use plain language and no em dashes.`;

function cleanStructuredText(value: string, maxLength: number): string {
  return value
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function cleanWinners(values: string[]): string[] {
  const seen = new Set<string>();
  const winners: string[] = [];
  for (const value of values.slice(0, 5)) {
    const name = cleanStructuredText(value, 300).split(/:\s+/u, 1)[0]?.trim() ?? '';
    const key = name.toLocaleLowerCase('en-US');
    if (!name || seen.has(key)) continue;
    seen.add(key);
    winners.push(name.slice(0, 120).trim());
  }
  return winners;
}

function cleanQuestionResult(
  result: Omit<VisibilityQuestion, 'q'>,
): Omit<VisibilityQuestion, 'q'> {
  return {
    appeared: result.appeared,
    winners: cleanWinners(result.winners),
    sources: result.sources
      .slice(0, 5)
      .map((source) => cleanStructuredText(source, 120))
      .filter(Boolean),
    missing: cleanStructuredText(result.missing, 400),
  };
}

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
    results.push({ q: question, ...cleanQuestionResult(result) });
  }

  return { engine: 'gpt-5.6-web-search', questions: results };
}
