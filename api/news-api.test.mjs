import test from 'node:test';
import assert from 'node:assert/strict';

import handler from './news-api.js';

function makeRequest(url = 'https://worldmonitor.app/api/news-api?q=test&limit=5') {
  return new Request(url, {
    headers: {
      origin: 'https://worldmonitor.app',
    },
  });
}

test('returns RSS with merged and deduped stories from NewsAPI and GNews', async () => {
  const originalFetch = globalThis.fetch;
  const originalNewsApiKey = process.env.NEWSAPI_API_KEY;
  const originalGNewsKey = process.env.GNEWS_API_KEY;

  process.env.NEWSAPI_API_KEY = 'newsapi-key';
  process.env.GNEWS_API_KEY = 'gnews-key';

  try {
    globalThis.fetch = async (url) => {
      const parsed = new URL(String(url));
      if (parsed.hostname === 'newsapi.org') {
        return new Response(JSON.stringify({
          articles: [
            {
              title: 'Story A',
              url: 'https://example.com/a',
              publishedAt: '2026-01-01T00:00:00Z',
              source: { name: 'Wire A' },
            },
            {
              title: 'Story Duplicate',
              url: 'https://example.com/shared',
              publishedAt: '2026-01-01T01:00:00Z',
              source: { name: 'Wire B' },
            },
          ],
        }), { status: 200 });
      }

      if (parsed.hostname === 'gnews.io') {
        return new Response(JSON.stringify({
          articles: [
            {
              title: 'Story Duplicate from GNews',
              url: 'https://example.com/shared',
              publishedAt: '2026-01-01T02:00:00Z',
              source: { name: 'Wire C' },
            },
          ],
        }), { status: 200 });
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    const response = await handler(makeRequest());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/rss+xml; charset=utf-8');

    const body = await response.text();
    assert.match(body, /Story A/);
    assert.match(body, /Story Duplicate/);

    const occurrences = (body.match(/Story Duplicate/g) || []).length;
    assert.equal(occurrences, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNewsApiKey === undefined) delete process.env.NEWSAPI_API_KEY;
    else process.env.NEWSAPI_API_KEY = originalNewsApiKey;

    if (originalGNewsKey === undefined) delete process.env.GNEWS_API_KEY;
    else process.env.GNEWS_API_KEY = originalGNewsKey;
  }
});

test('returns empty RSS feed when API keys are not configured', async () => {
  const originalFetch = globalThis.fetch;
  const originalNewsApiKey = process.env.NEWSAPI_API_KEY;
  const originalGNewsKey = process.env.GNEWS_API_KEY;

  delete process.env.NEWSAPI_API_KEY;
  delete process.env.GNEWS_API_KEY;

  try {
    globalThis.fetch = async () => {
      throw new Error('fetch should not be called when keys are missing');
    };

    const response = await handler(makeRequest('https://worldmonitor.app/api/news-api?q=world&limit=3'));
    assert.equal(response.status, 200);

    const body = await response.text();
    assert.match(body, /<rss version="2.0">/);
    assert.equal(body.includes('<item>'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNewsApiKey === undefined) delete process.env.NEWSAPI_API_KEY;
    else process.env.NEWSAPI_API_KEY = originalNewsApiKey;

    if (originalGNewsKey === undefined) delete process.env.GNEWS_API_KEY;
    else process.env.GNEWS_API_KEY = originalGNewsKey;
  }
});
