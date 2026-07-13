import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSite, htmlToText, findSubpages } from '../src/lib/fetch-site.ts';

test('htmlToText strips tags, scripts, styles, and collapses whitespace', () => {
  const html =
    '<html><script>x()</script><style>.a{}</style><body><h1>Hi</h1>\n<p>There&nbsp;now</p></body></html>';
  assert.equal(htmlToText(html), 'Hi There now');
});

test('findSubpages picks useful same-host links with a deduped maximum of three', () => {
  const base = new URL('https://example.com');
  const html = `
    <a href="/about">About</a>
    <a href="/services/hvac">Services</a>
    <a href="https://example.com/contact-us">Contact</a>
    <a href="https://other.com/about">External</a>
    <a href="/blog">Blog</a>
    <a href="/about">About again</a>`;
  assert.deepEqual(findSubpages(html, base), [
    'https://example.com/about',
    'https://example.com/services/hvac',
    'https://example.com/contact-us',
  ]);
});

function fakeFetch(pages: Record<string, string>): typeof fetch {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    if (pages[url] !== undefined) {
      return new Response(pages[url], {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    return new Response('nope', { status: 404 });
  };
}

test('fetchSite combines homepage and subpages, capped at 12000 characters', async () => {
  const site = await fetchSite(
    'https://example.com',
    fakeFetch({
      'https://example.com/': `<a href="/about">About</a><p>${'home '.repeat(2000)}</p>`,
      'https://example.com/about': `<p>${'about '.repeat(2000)}</p>`,
    }),
  );
  assert.equal(site.limited, false);
  assert.deepEqual(site.pagesFetched, ['https://example.com/', 'https://example.com/about']);
  assert.ok(site.text !== null && site.text.length <= 12000);
  assert.ok(site.text?.includes('about'));
});

test('fetchSite bounds the bytes read from an oversized response body', async () => {
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new TextEncoder().encode('x'.repeat(65_536)));
    },
    cancel() {
      cancelled = true;
    },
  });
  const fetchImpl: typeof fetch = async () =>
    new Response(body, { headers: { 'content-type': 'text/html' } });

  const site = await fetchSite('https://example.com', fetchImpl);
  assert.equal(site.text?.length, 12000);
  assert.ok(pulls <= 6);
  assert.equal(cancelled, true);
});

test('fetchSite returns limited when the homepage fails or is not HTML', async () => {
  const failed = await fetchSite('https://example.com', fakeFetch({}));
  assert.equal(failed.limited, true);
  assert.equal(failed.text, null);

  const nonHtml: typeof fetch = async () =>
    new Response('{}', { headers: { 'content-type': 'application/json' } });
  const rejected = await fetchSite('https://example.com', nonHtml);
  assert.equal(rejected.limited, true);
  assert.equal(rejected.text, null);
});
