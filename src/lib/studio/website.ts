import { lookup } from 'dns/promises';
import { isIP } from 'net';

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const MAX_TEXT_CHARS = 12_000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Reelwright/1.0';

export class WebsiteError extends Error {}

export interface ScrapedWebsite {
  url: string;
  title: string;
  description: string;
  text: string;
  colorHints: string[];
  logoCandidates: string[];
}

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new WebsiteError('Enter your website address.');
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new WebsiteError('That doesn’t look like a website address.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new WebsiteError('Use an http or https website address.');
  }
  if (url.username || url.password) {
    throw new WebsiteError('That doesn’t look like a website address.');
  }
  if (!url.hostname.includes('.')) {
    throw new WebsiteError('That doesn’t look like a public website.');
  }
  url.hash = '';
  return url.toString();
}

function isPrivateIPv4(ip: string) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateAddress(ip: string) {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) return isPrivateIPv4(lower.slice(7));
  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower.startsWith('ff')
  );
}

async function assertPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new WebsiteError('That doesn’t look like a public website.');
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new WebsiteError('We couldn’t find that website. Check the address.');
      });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new WebsiteError('That doesn’t look like a public website.');
  }
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchHtml(startUrl: string): Promise<{ url: string; html: string }> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(new URL(url).hostname);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new WebsiteError('That website didn’t respond. Try again or check the address.');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      url = normalizeWebsiteUrl(new URL(location, url).toString());
      continue;
    }
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new WebsiteError(
        'That website blocks automated visitors, so we couldn’t read it. Fill in your brand details by hand instead.'
      );
    }
    if (!response.ok) {
      throw new WebsiteError(`That website returned an error (HTTP ${response.status}).`);
    }
    const type = response.headers.get('content-type') || '';
    if (type && !type.includes('html')) {
      throw new WebsiteError('That address isn’t a web page.');
    }
    return { url, html: await readCapped(response) };
  }
  throw new WebsiteError('That website redirected too many times.');
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function metaContent(html: string, key: string) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`,
    'i'
  );
  const match = html.match(re);
  return decodeEntities((match?.[1] || match?.[2] || '').trim());
}

function absolutize(base: string, href: string | undefined | null) {
  if (!href) return null;
  try {
    const url = new URL(decodeEntities(href.trim()), base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function extractColorHints(html: string) {
  const counts = new Map<string, number>();
  const theme = metaContent(html, 'theme-color');
  if (/^#[0-9a-f]{6}$/i.test(theme)) counts.set(theme.toUpperCase(), 100);

  const styleBlocks = [
    ...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),
    ...html.matchAll(/style=["']([^"']+)["']/gi),
  ]
    .map((m) => m[1])
    .join('\n');

  for (const match of styleBlocks.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let hex = match[1].toUpperCase();
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const value = `#${hex}`;
    if (value === '#FFFFFF' || value === '#000000') continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([hex]) => hex);
}

function extractLogoCandidates(html: string, base: string) {
  const found: string[] = [];
  const push = (href: string | null | undefined) => {
    const url = absolutize(base, href);
    if (url && !found.includes(url)) found.push(url);
  };

  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = img[0];
    if (!/logo/i.test(tag)) continue;
    push(tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]);
  }
  for (const link of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = link[0];
    if (/rel=["'][^"']*(apple-touch-icon|icon)[^"']*["']/i.test(tag)) {
      push(tag.match(/\bhref=["']([^"']+)["']/i)?.[1]);
    }
  }
  push(metaContent(html, 'og:image'));
  return found.slice(0, 8);
}

function extractText(html: string) {
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 30);

  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h\d|section|article|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const text = decodeEntities(body)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 1)
    .join('\n');

  return [headings.length ? `Headings:\n${headings.join('\n')}` : '', text]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, MAX_TEXT_CHARS);
}

export async function scrapeWebsite(rawUrl: string): Promise<ScrapedWebsite> {
  const { url, html } = await fetchHtml(normalizeWebsiteUrl(rawUrl));
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '');
  const description = metaContent(html, 'description') || metaContent(html, 'og:description');
  const text = extractText(html);
  if (text.length < 80 && !description) {
    throw new WebsiteError(
      'We couldn’t read much from that page. It may load its content with JavaScript; fill in your brand details by hand instead.'
    );
  }
  return {
    url,
    title,
    description,
    text,
    colorHints: extractColorHints(html),
    logoCandidates: extractLogoCandidates(html, url),
  };
}
