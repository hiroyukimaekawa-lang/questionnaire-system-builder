import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  proxyRequest,
  rewriteLocation,
  upstreamUrl,
} from '../../cloudflare/crestix-questionnaire-pages/dist/_worker.js';

const publicOrigin = 'https://crestix-questionnaire.pages.dev';
const upstreamOrigin = 'https://survey-pages.hiroyuki-maekawa.workers.dev';

test('Pages proxy preserves path, query, and RSC query', () => {
  const url = upstreamUrl(`${publicOrigin}/admin?status=draft&_rsc=abc`);

  assert.equal(url.origin, upstreamOrigin);
  assert.equal(url.pathname, '/admin');
  assert.equal(url.search, '?status=draft&_rsc=abc');
});

test('Pages proxy forwards request headers and POST body without proxy headers', async () => {
  const body = JSON.stringify({ title: 'Survey' });
  const request = new Request(`${publicOrigin}/api/admin/surveys/create-from-builder?_rsc=abc`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer test',
      cookie: 'session=test',
      'content-type': 'application/json',
      rsc: '1',
      'next-router-state-tree': 'state',
    },
    body,
  });
  let forwarded: Request | undefined;
  const upstreamResponse = new Response('created', { status: 201 });

  const response = await proxyRequest(request, async (nextRequest) => {
    forwarded = nextRequest;
    return upstreamResponse;
  });

  assert.equal(response, upstreamResponse);
  assert.equal(forwarded?.url, `${upstreamOrigin}/api/admin/surveys/create-from-builder?_rsc=abc`);
  assert.equal(forwarded?.headers.get('authorization'), 'Bearer test');
  assert.equal(forwarded?.headers.get('cookie'), 'session=test');
  assert.equal(forwarded?.headers.get('content-type'), 'application/json');
  assert.equal(forwarded?.headers.get('rsc'), '1');
  assert.equal(forwarded?.headers.get('next-router-state-tree'), 'state');
  assert.equal(forwarded?.headers.get('x-forwarded-host'), null);
  assert.equal(forwarded?.headers.get('x-forwarded-proto'), null);
  assert.equal(await forwarded?.text(), body);
});

test('Pages proxy returns normal responses unchanged', async () => {
  const upstreamResponse = new Response('RSC payload', {
    headers: {
      'cache-control': 'private, max-age=10',
      vary: 'RSC, Next-Router-State-Tree',
      etag: 'test-etag',
    },
  });

  const response = await proxyRequest(
    new Request(`${publicOrigin}/admin?_rsc=abc`, { headers: { rsc: '1' } }),
    async () => upstreamResponse,
  );

  assert.equal(response, upstreamResponse);
  assert.equal(response.headers.get('cache-control'), 'private, max-age=10');
  assert.equal(response.headers.get('vary'), 'RSC, Next-Router-State-Tree');
});

test('Pages proxy rewrites an upstream absolute redirect and preserves Set-Cookie', async () => {
  const upstreamResponse = new Response(null, {
    status: 302,
    headers: {
      location: `${upstreamOrigin}/admin?status=draft`,
      'set-cookie': 'session=test; Path=/; HttpOnly',
    },
  });

  const response = await proxyRequest(
    new Request(`${publicOrigin}/login`),
    async () => upstreamResponse,
  );

  assert.notEqual(response, upstreamResponse);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), `${publicOrigin}/admin?status=draft`);
  assert.equal(response.headers.get('set-cookie'), 'session=test; Path=/; HttpOnly');
});

test('Pages proxy leaves relative redirects unchanged', async () => {
  const upstreamResponse = new Response(null, {
    status: 302,
    headers: { location: '/admin' },
  });

  const response = await proxyRequest(new Request(`${publicOrigin}/login`), async () => upstreamResponse);

  assert.equal(response, upstreamResponse);
  assert.equal(response.headers.get('location'), '/admin');
});

test('Pages proxy leaves external redirects unchanged', async () => {
  const upstreamResponse = new Response(null, {
    status: 302,
    headers: { location: 'https://external.example/path' },
  });

  const response = await proxyRequest(new Request(`${publicOrigin}/login`), async () => upstreamResponse);

  assert.equal(response, upstreamResponse);
  assert.equal(response.headers.get('location'), 'https://external.example/path');
});

test('rewriteLocation only rewrites absolute upstream URLs', () => {
  assert.equal(rewriteLocation(`${upstreamOrigin}/admin`, `${publicOrigin}/login`), `${publicOrigin}/admin`);
  assert.equal(rewriteLocation('/admin', `${publicOrigin}/login`), '/admin');
  assert.equal(rewriteLocation('https://external.example/path', `${publicOrigin}/login`), 'https://external.example/path');
});

test('Pages proxy source does not mutate normal response or forwarding headers', async () => {
  const source = await readFile(
    new URL('../../cloudflare/crestix-questionnaire-pages/dist/_worker.js', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /headers\.set\(['"]host['"]/i);
  assert.doesNotMatch(source, /headers\.set\(['"]x-forwarded-host['"]/i);
  assert.doesNotMatch(source, /headers\.set\(['"]x-forwarded-proto['"]/i);
  assert.doesNotMatch(source, /headers\.set\(['"]cache-control['"]/i);
  assert.doesNotMatch(source, /appendVaryCookie|Vary:\s*Cookie/i);
  assert.doesNotMatch(source, /getSetCookie/);
  assert.match(source, /if \(rewrittenLocation === location\) return upstream;/);
});
