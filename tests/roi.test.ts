import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRoi, VERTICALS, problemPhraseFor } from '../src/lib/roi.ts';

test('roi formula uses missed calls, lead share, recovery, close rate, and average job', () => {
  const result = computeRoi('hvac');
  assert.equal(result.lowMonthly, 510);
  assert.ok(result.highMonthly > result.lowMonthly);
});

test('roi is hard-capped at 25% of estimated current new-job revenue', () => {
  const result = computeRoi('hvac');
  assert.equal(result.capped, false);

  const general = computeRoi('general');
  const uncappedLow = 40 * 0.26 * 0.45 * 0.3 * 0.4 * 300;
  assert.equal(general.lowMonthly, Math.round(uncappedLow));
});

test('unknown vertical falls back to general', () => {
  assert.deepEqual(computeRoi('unicorn-grooming'), computeRoi('general'));
});

test('assumptions table is included with sources', () => {
  const result = computeRoi('roofing');
  assert.ok(Object.keys(result.assumptions).length >= 6);
  for (const assumption of Object.values(result.assumptions)) {
    assert.ok(assumption.source.length > 0);
  }
});

test('verticals list and problem phrases exist', () => {
  assert.ok(VERTICALS.includes('hvac'));
  assert.equal(problemPhraseFor('plumbing'), 'an emergency plumber');
  assert.equal(problemPhraseFor('nope'), 'help with a home repair');
});
