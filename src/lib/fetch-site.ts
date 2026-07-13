export interface SiteData {
  text: string | null;
  pagesFetched: string[];
  limited: boolean;
}

const SUBPAGE_PATTERNS = /about|service|contact/i;
const MAX_SUBPAGES = 3;
const MAX_CHARS = 12_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const TIMEOUT_MS = 3_000;

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findSubpages(html: string, base: URL): string[] {
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map(
    (match) => match[1],
  );
  const output: string[] = [];

  for (const href of hrefs) {
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.host !== base.host || !SUBPAGE_PATTERNS.test(url.pathname)) continue;
    url.hash = '';
    const candidate = url.toString();
    if (!output.includes(candidate)) output.push(candidate);
    if (output.length >= MAX_SUBPAGES) break;
  }

  return output;
}

async function readBoundedText(response: Response): Promise<string | null> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (bytesRead < MAX_RESPONSE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_RESPONSE_BYTES - bytesRead;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      bytesRead += chunk.byteLength;
      if (value.byteLength > remaining) break;
    }
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchPage(url: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'AI-Opportunity-Snapshot/1.0 (+https://revenuewithai.com)' },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }
    return await readBoundedText(response);
  } catch {
    return null;
  }
}

export async function fetchSite(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteData> {
  const base = new URL(url);
  const homeUrl = base.toString();
  const homeHtml = await fetchPage(homeUrl, fetchImpl);
  if (homeHtml === null) return { text: null, pagesFetched: [], limited: true };

  const pagesFetched = [homeUrl];
  let text = htmlToText(homeHtml);
  for (const subpage of findSubpages(homeHtml, base)) {
    if (text.length >= MAX_CHARS) break;
    const html = await fetchPage(subpage, fetchImpl);
    if (html === null) continue;
    pagesFetched.push(subpage);
    text += ` ${htmlToText(html)}`;
  }

  return { text: text.slice(0, MAX_CHARS), pagesFetched, limited: false };
}
