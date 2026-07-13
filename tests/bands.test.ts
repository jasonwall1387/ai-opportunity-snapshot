import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandFor, RUBRIC_TEXT } from '../src/lib/bands.ts';

test('band boundaries are exact', () => {
  assert.equal(bandFor(0), 'Invisible');
  assert.equal(bandFor(20), 'Invisible');
  assert.equal(bandFor(21), 'Basic presence');
  assert.equal(bandFor(40), 'Basic presence');
  assert.equal(bandFor(41), 'Findable but manual');
  assert.equal(bandFor(60), 'Findable but manual');
  assert.equal(bandFor(61), 'Responsive, partially automated');
  assert.equal(bandFor(80), 'Responsive, partially automated');
  assert.equal(bandFor(81), 'AI-ready');
  assert.equal(bandFor(100), 'AI-ready');
});

test('out-of-range scores clamp', () => {
  assert.equal(bandFor(-5), 'Invisible');
  assert.equal(bandFor(140), 'AI-ready');
});

test('rubric text names every band', () => {
  for (const label of [
    'Invisible',
    'Basic presence',
    'Findable but manual',
    'Responsive, partially automated',
    'AI-ready',
  ]) {
    assert.ok(RUBRIC_TEXT.includes(label), `rubric missing ${label}`);
  }
});
