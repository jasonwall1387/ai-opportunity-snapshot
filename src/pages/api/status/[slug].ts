import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { KvStore } from '../../../lib/store.ts';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response('Not found', { status: 404 });
  const status = await new KvStore(env.SNAPSHOTS).getStatus(slug);
  if (!status) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(status), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
};
