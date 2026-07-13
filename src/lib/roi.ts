import type { RoiResult } from './types.ts';
import assumptionsJson from './data/vertical-assumptions.json';

export interface VerticalRow {
  label: string;
  problemPhrase: string;
  avgJobValue: { low: number; high: number };
  monthlyInboundCalls: { low: number; high: number };
  missedCallRate: number;
  newLeadShare: number;
  recoveryRate: number;
  closeRate: number;
  estMonthlyNewJobs: { low: number; high: number };
  source: string;
}

const TABLE: Record<string, VerticalRow> = assumptionsJson;

export const VERTICALS = Object.keys(TABLE);

export function verticalRow(vertical: string): VerticalRow {
  return TABLE[vertical] ?? TABLE.general;
}

export function problemPhraseFor(vertical: string): string {
  return verticalRow(vertical).problemPhrase;
}

function bound(row: VerticalRow, side: 'low' | 'high'): { value: number; capped: boolean } {
  const raw =
    row.monthlyInboundCalls[side] *
    row.missedCallRate *
    row.newLeadShare *
    row.recoveryRate *
    row.closeRate *
    row.avgJobValue[side];
  const cap = 0.25 * row.estMonthlyNewJobs[side] * row.avgJobValue[side];
  return raw > cap ? { value: cap, capped: true } : { value: raw, capped: false };
}

export function computeRoi(vertical: string): RoiResult {
  const row = verticalRow(vertical);
  const low = bound(row, 'low');
  const high = bound(row, 'high');

  return {
    lowMonthly: Math.round(low.value),
    highMonthly: Math.round(high.value),
    capped: low.capped || high.capped,
    assumptions: {
      'Average job value estimate': {
        value: `$${row.avgJobValue.low} - $${row.avgJobValue.high}`,
        source: row.source,
      },
      'Monthly inbound calls estimate': {
        value: `${row.monthlyInboundCalls.low} - ${row.monthlyInboundCalls.high}`,
        source: row.source,
      },
      'Missed-call rate estimate': { value: row.missedCallRate, source: row.source },
      'Share of calls that are new leads': { value: row.newLeadShare, source: row.source },
      'Recovery rate with automation': { value: row.recoveryRate, source: row.source },
      'Close rate on recovered leads': { value: row.closeRate, source: row.source },
      'Cap - 25% of estimated current new-job revenue': {
        value: `${row.estMonthlyNewJobs.low} - ${row.estMonthlyNewJobs.high} jobs/mo`,
        source: 'Hard cap so the estimate can never exceed a quarter of current volume',
      },
    },
  };
}
