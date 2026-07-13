import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURE_SNAPSHOT } from '../lib/data/fixture-snapshot.ts';
import { renderReportHtml } from '../lib/render-report.ts';
import { violatesCopyRules } from '../lib/copy.ts';
import { FileStore } from '../lib/store.ts';
import { Llm, llmConfigFromEnv } from '../lib/openai.ts';
import { runPipeline } from '../lib/pipeline.ts';
import { makeSlug } from '../lib/slug.ts';
import type { SnapshotInput } from '../lib/types.ts';

function loadDevVars(): Record<string, string | undefined> {
  const values: Record<string, string> = {};
  if (existsSync('.dev.vars')) {
    for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match?.[1] !== undefined && match[2] !== undefined) {
        values[match[1]] = match[2].trim();
      }
    }
  }
  return { ...values, ...process.env };
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function wrapForPreview(inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Snapshot preview</title>
<link rel="stylesheet" href="../src/styles/report.css"></head><body><div class="wrap">${inner}</div></body></html>`;
}

async function main(): Promise<void> {
  mkdirSync('output', { recursive: true });

  if (process.argv.includes('--fixture')) {
    const html = renderReportHtml(FIXTURE_SNAPSHOT);
    const issues = violatesCopyRules(html);
    if (issues.length > 0) {
      console.error('COPY RULE VIOLATIONS:', issues);
      process.exit(1);
    }
    writeFileSync(join('output', 'fixture-report.html'), wrapForPreview(html), 'utf8');
    console.log('Fixture render OK -> output/fixture-report.html');
    return;
  }

  const name = argument('name');
  const rawUrl = argument('url');
  if (!name || !rawUrl) {
    console.error(
      'Usage: npm run snapshot -- --name "Acme HVAC" --url https://acme.com [--city "Plano, TX"] [--vertical hvac]',
    );
    process.exit(1);
  }

  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('The website must use http or https');
  }

  const llm = new Llm(llmConfigFromEnv(loadDevVars()));
  const store = new FileStore('output');
  const slug = makeSlug(name);
  const city = argument('city');
  const vertical = argument('vertical');
  const input: SnapshotInput = {
    name,
    url: url.toString(),
    ...(city ? { city } : {}),
    ...(vertical ? { vertical } : {}),
  };

  console.log(`Running snapshot for ${name} -> ${slug}`);
  const snapshot = await runPipeline(input, slug, { store, llm });
  if (!snapshot) {
    console.error('Run failed. See status output above.');
    process.exit(1);
  }

  writeFileSync(
    join('output', `${slug}-report.html`),
    wrapForPreview(renderReportHtml(snapshot)),
    'utf8',
  );
  console.log(
    `Done. Score ${snapshot.score.total} (${snapshot.score.band}). ` +
      `Estimated monthly range ${snapshot.roi.lowMonthly}-${snapshot.roi.highMonthly}. ` +
      `Estimated cost $${snapshot.meta.usage.estCostUsd.toFixed(2)} in ${(snapshot.meta.durationMs / 1000).toFixed(0)}s. ` +
      `Warnings: ${snapshot.meta.warnings.length}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unexpected CLI failure');
  process.exit(1);
});
