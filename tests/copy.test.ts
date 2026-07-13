import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COPY, violatesCopyRules } from '../src/lib/copy.ts';

test('copy constants obey the copy rules', () => {
  for (const [key, value] of Object.entries(COPY)) {
    assert.deepEqual(violatesCopyRules(String(value)), [], `COPY.${key} violates copy rules`);
  }
});

test('violatesCopyRules catches em dash', () => {
  const text = `a ${String.fromCodePoint(0x2014)} b`;
  assert.deepEqual(violatesCopyRules(text), ['em dash found']);
});

test('violatesCopyRules catches the banned review word at a word boundary', () => {
  assert.deepEqual(violatesCopyRules('Free ' + 'Aud' + 'it today'), [
    'the banned review word found',
  ]);
  assert.deepEqual(violatesCopyRules('auditorium is fine'), []);
});

test('violatesCopyRules catches the banned consultation phrase', () => {
  assert.deepEqual(violatesCopyRules('book a clarity ' + 'call'), [
    'the banned consultation phrase found',
  ]);
});

test('clean text passes', () => {
  assert.deepEqual(violatesCopyRules('AI Opportunity Snapshot - see what AI knows'), []);
});
