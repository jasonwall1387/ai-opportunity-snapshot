import type { Analysis, Research, SnapshotInput, Visibility } from './types.ts';
import type { Llm } from './openai.ts';
import { RUBRIC_TEXT } from './bands.ts';
import { violatesCopyRules } from './copy.ts';

const effortImpact = { type: 'string', enum: ['low', 'medium', 'high'] } as const;
const boundedScore = { type: 'number', minimum: 0, maximum: 100 } as const;

const subScores = {
  type: 'object',
  additionalProperties: false,
  properties: {
    visibility: boundedScore,
    leadCapture: boundedScore,
    reviews: boundedScore,
    responsiveness: boundedScore,
    automation: boundedScore,
  },
  required: ['visibility', 'leadCapture', 'reviews', 'responsiveness', 'automation'],
} as const;

export const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: {
      type: 'object',
      additionalProperties: false,
      properties: { total: boundedScore, sub: subScores },
      required: ['total', 'sub'],
    },
    opportunities: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          effort: effortImpact,
          impact: effortImpact,
        },
        required: ['title', 'description', 'effort', 'impact'],
      },
    },
    firstAutomation: {
      type: 'object',
      additionalProperties: false,
      properties: { title: { type: 'string' }, why: { type: 'string' } },
      required: ['title', 'why'],
    },
  },
  required: ['score', 'opportunities', 'firstAutomation'],
} as const;

const INSTRUCTIONS = `You are an automation consultant for local service businesses. You are given verified research and AI-visibility results for one business. Produce its AI Opportunity Snapshot analysis.

Score with this rubric, exactly as written:
${RUBRIC_TEXT}

Rules:
- The total score must be consistent with the sub-scores.
- Return exactly 5 opportunities, ordered highest leverage first. Each must be a concrete automation or fix that can ship in weeks. Keep titles to 8 words and descriptions to 1-2 plain sentences.
- Pick the single best first automation and explain why in 2-3 sentences a non-technical owner understands.
- Never output a dollar amount. Revenue math happens outside this call.
- Use plain English, no em dashes, and obey the product copy constraints.
- Base everything only on the evidence given. Do not invent facts.`;

function assertSafeAnalysis(analysis: Analysis): void {
  const copy = [
    ...analysis.opportunities.flatMap(({ title, description }) => [title, description]),
    analysis.firstAutomation.title,
    analysis.firstAutomation.why,
  ].join('\n');
  if (/\$\s*\d|\b(?:usd|dollars?)\b/i.test(copy)) {
    throw new Error('Analysis contained a model-generated dollar figure');
  }
  const copyIssues = violatesCopyRules(copy);
  if (copyIssues.length > 0) {
    throw new Error(`Analysis violated copy rules: ${copyIssues.join(', ')}`);
  }
}

export async function runAnalysis(
  llm: Llm,
  input: SnapshotInput,
  research: Research,
  visibility: Visibility,
): Promise<Analysis> {
  const analysis = await llm.json<Analysis>({
    instructions: INSTRUCTIONS,
    input: JSON.stringify({ business: input, research, visibility }),
    schemaName: 'snapshot_analysis',
    schema: analysisSchema,
  });
  assertSafeAnalysis(analysis);
  return analysis;
}
