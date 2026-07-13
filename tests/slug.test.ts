import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSlug, slugify } from '../src/lib/slug.ts';

test('slugify kebab-cases and strips punctuation', () => {
  assert.equal(slugify("Bob's HVAC & Sons, LLC"), 'bob-s-hvac-sons-llc');
});

test('slugify never returns empty', () => {
  assert.equal(slugify('!!!'), 'business');
});

test('makeSlug appends a 6-character suffix', () => {
  const slug = makeSlug('Acme Remodeling');
  assert.match(slug, /^acme-remodeling-[a-z2-9]{6}$/);
});

test('makeSlug is collision-resistant across calls', () => {
  const seen = new Set(Array.from({ length: 50 }, () => makeSlug('Same Name')));
  assert.equal(seen.size, 50);
});
