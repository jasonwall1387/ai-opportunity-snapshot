import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { KvStore } from '../../lib/store.ts';
import { Llm, llmConfigFromEnv } from '../../lib/openai.ts';
import { runPipeline } from '../../lib/pipeline.ts';
import { makeSlug } from '../../lib/slug.ts';
import { checkRateLimit, privacyIdentifier } from '../../lib/rate-limit.ts';
import { normalizeSnapshotInput, requestIdentity } from '../../lib/input.ts';

export const prerender = false;

const MAX_BODY_BYTES = 4_096;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new Error('request body too large');
  }
  if (!request.body) throw new Error('request body missing');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) throw new Error('request body too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return json({ error: 'Invalid or oversized JSON body' }, 400);
  }

  const normalized = normalizeSnapshotInput(body);
  if (!normalized.ok) return json({ error: normalized.error }, 400);

  let baseConfig;
  try {
    baseConfig = llmConfigFromEnv(env);
  } catch {
    return json({ error: 'Snapshot generation is not configured yet' }, 503);
  }

  const identity = requestIdentity(request);
  if (!(await checkRateLimit(env.SNAPSHOTS, identity))) {
    return json({ error: 'Rate limit reached - try again in an hour' }, 429);
  }

  const store = new KvStore(env.SNAPSHOTS);
  const slug = makeSlug(normalized.input.name);
  await store.putStatus(slug, { stage: 'queued', updatedAt: new Date().toISOString() });

  const llm = new Llm({
    ...baseConfig,
    safetyIdentifier: await privacyIdentifier(identity),
  });
  await runPipeline(normalized.input, slug, { store, llm });
  return json({ slug }, 202);
};
