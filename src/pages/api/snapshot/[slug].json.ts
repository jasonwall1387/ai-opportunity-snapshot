import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { KvStore } from '../../../lib/store.ts';
import { FIXTURE_SNAPSHOT } from '../../../lib/data/fixture-snapshot.ts';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response('Not found', { status: 404 });
  const snapshot =
    slug === FIXTURE_SNAPSHOT.slug
      ? FIXTURE_SNAPSHOT
      : await new KvStore(env.SNAPSHOTS).getSnapshot(slug);
  if (!snapshot) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-content-type-options': 'nosniff',
    },
  });
};
