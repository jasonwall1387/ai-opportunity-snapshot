import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('snapshot generation stays attached to the HTTP request until the pipeline finishes', () => {
  const route = readFileSync('src/pages/api/snapshot.ts', 'utf8');

  assert.doesNotMatch(route, /\.waitUntil\s*\(/);
  assert.match(route, /await\s+runPipeline\s*\(/);
});

test('intake explains the connected wait while GPT-5.6 is researching', () => {
  const page = readFileSync('src/pages/index.astro', 'utf8');

  assert.match(page, /Researching with GPT-5\.6/);
  assert.match(page, /Keep this tab open/);
});
