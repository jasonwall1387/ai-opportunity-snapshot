import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReportHtml } from '../src/lib/render-report.ts';
import { FIXTURE_SNAPSHOT } from '../src/lib/data/fixture-snapshot.ts';
import { violatesCopyRules } from '../src/lib/copy.ts';

test('rendered fixture report obeys copy rules end to end', () => {
  const html = renderReportHtml(FIXTURE_SNAPSHOT);
  assert.deepEqual(violatesCopyRules(html), []);
});

test('report contains the score, band, estimate range, opportunities, and visibility', () => {
  const html = renderReportHtml(FIXTURE_SNAPSHOT);
  assert.ok(html.includes('47'));
  assert.ok(html.includes('Findable but manual'));
  assert.ok(html.includes('$510'));
  assert.ok(html.includes('$4,101'));
  for (const opportunity of FIXTURE_SNAPSHOT.opportunities) {
    assert.ok(html.includes(opportunity.title));
  }
  assert.ok(html.includes('gpt-5.6'));
  assert.ok(html.includes('Missed-call text-back'));
});

test('renderer escapes HTML in business-controlled fields', () => {
  const unsafe = structuredClone(FIXTURE_SNAPSHOT);
  unsafe.business.name = '<script>alert(1)</script>';
  const html = renderReportHtml(unsafe);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderer normalizes forbidden generated punctuation', () => {
  const unsafe = structuredClone(FIXTURE_SNAPSHOT);
  unsafe.visibility.questions[0]!.missing = `Gap ${String.fromCodePoint(0x2014)} needs work.`;
  assert.deepEqual(violatesCopyRules(renderReportHtml(unsafe)), []);
});

test('limited site data shows the disclosure note', () => {
  const limited = structuredClone(FIXTURE_SNAPSHOT);
  limited.meta.limitedSiteData = true;
  assert.ok(renderReportHtml(limited).includes('based on public web data only'));
});
