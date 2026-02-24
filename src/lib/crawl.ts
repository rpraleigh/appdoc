import * as cheerio from 'cheerio';
import type { CrawledPage } from '@/types';

const MAX_PAGES = 30;
const MAX_TEXT_CHARS = 8000;
const FETCH_TIMEOUT_MS = 10000;

function sameOrigin(base: string, href: string): string | null {
  try {
    const baseUrl = new URL(base);
    const resolved = new URL(href, base);
    if (resolved.origin !== baseUrl.origin) return null;
    // Strip hash
    resolved.hash = '';
    return resolved.href;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AppDoc-Crawler/1.0' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function crawlSite(startUrl: string, depth: number): Promise<CrawledPage[]> {
  const maxDepth = Math.min(Math.max(depth, 1), 4);
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];

  // BFS queue: [url, currentDepth]
  const queue: Array<[string, number]> = [[startUrl, 0]];
  visited.add(startUrl);

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const item = queue.shift();
    if (!item) break;
    const [url, currentDepth] = item;

    const html = await fetchPage(url);
    if (!html) continue;

    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, noscript, header, footer, nav').remove();

    const title = $('title').text().trim() || url;

    // Extract nav links before removing nav
    const navLinks: string[] = [];
    $('nav a[href], header a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const resolved = sameOrigin(url, href);
        if (resolved) navLinks.push(resolved);
      }
    });

    // Prefer main content
    const contentEl = $('main').length ? $('main') : $('body');
    let text = contentEl.text().replace(/\s+/g, ' ').trim();
    if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS);

    pages.push({ url, title, text, navLinks });

    // Enqueue children if within depth
    if (currentDepth < maxDepth) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const resolved = sameOrigin(url, href);
        if (resolved && !visited.has(resolved)) {
          visited.add(resolved);
          queue.push([resolved, currentDepth + 1]);
        }
      });
    }
  }

  return pages;
}
