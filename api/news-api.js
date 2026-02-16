export const config = { runtime: 'edge' };

import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;
const DEFAULT_LANGUAGE = 'en';

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit || '', 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
}

function cleanXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeItem(raw, provider) {
  const title = raw?.title ? String(raw.title) : '';
  const link = raw?.url ? String(raw.url) : '';
  if (!title || !link) return null;

  const sourceName = raw?.source?.name || raw?.source?.title || provider;
  const dateValue = raw?.publishedAt || raw?.published_at || raw?.pubDate;
  const pubDate = dateValue ? new Date(dateValue) : new Date();

  return {
    title,
    link,
    source: String(sourceName || provider),
    pubDate: Number.isNaN(pubDate.getTime()) ? new Date() : pubDate,
    provider,
  };
}

async function fetchNewsApi(searchParams, limit, language) {
  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) return [];

  const q = searchParams.get('q') || searchParams.get('query') || 'geopolitics OR conflict OR diplomacy';
  const pageSize = String(Math.min(limit, 20));
  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', q);
  url.searchParams.set('language', language);
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', pageSize);

  const response = await fetch(url.toString(), {
    headers: { 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`NewsAPI returned ${response.status}`);
  }

  const payload = await response.json();
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  return articles
    .map((item) => normalizeItem(item, 'NewsAPI'))
    .filter((item) => item !== null);
}

async function fetchGNews(searchParams, limit, language) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const q = searchParams.get('q') || searchParams.get('query') || 'geopolitics OR conflict OR diplomacy';
  const max = String(Math.min(limit, 10));
  const url = new URL('https://gnews.io/api/v4/search');
  url.searchParams.set('q', q);
  url.searchParams.set('lang', language);
  url.searchParams.set('sortby', 'publishedAt');
  url.searchParams.set('max', max);
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`GNews returned ${response.status}`);
  }

  const payload = await response.json();
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  return articles
    .map((item) => normalizeItem(item, 'GNews'))
    .filter((item) => item !== null);
}

function toRss(items, query) {
  const rssItems = items.map((item) => `
    <item>
      <title>${cleanXml(item.title)}</title>
      <link>${cleanXml(item.link)}</link>
      <guid isPermaLink="true">${cleanXml(item.link)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <source>${cleanXml(item.source)}</source>
      <description>${cleanXml(`${item.provider} aggregated article`)}</description>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>World Monitor News APIs (${cleanXml(query)})</title>
    <link>https://worldmonitor.app/api/news-api</link>
    <description>Merged stories from NewsAPI and GNews.</description>
    ${rssItems}
  </channel>
</rss>`;
}

export default async function handler(request) {
  const cors = getCorsHeaders(request);
  if (isDisallowedOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: {
        'content-type': 'application/json',
        ...cors,
      },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'));
    const language = searchParams.get('language') || DEFAULT_LANGUAGE;
    const query = searchParams.get('q') || searchParams.get('query') || 'geopolitics OR conflict OR diplomacy';

    const results = await Promise.allSettled([
      fetchNewsApi(searchParams, limit, language),
      fetchGNews(searchParams, limit, language),
    ]);

    const merged = results
      .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

    const deduped = [];
    const seen = new Set();
    for (const item of merged) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      deduped.push(item);
      if (deduped.length >= limit) break;
    }

    const rss = toRss(deduped, query);

    return new Response(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        ...cors,
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to aggregate news APIs',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
        ...cors,
      },
    });
  }
}
