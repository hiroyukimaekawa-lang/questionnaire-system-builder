import test from 'node:test';
import assert from 'node:assert/strict';
import nextConfig, { PAGES_PROXY_ALLOWED_ORIGINS } from '../next.config';

test('serverActions.allowedOrigins allows the Pages proxy production and preview domains', () => {
  assert.deepEqual(PAGES_PROXY_ALLOWED_ORIGINS, [
    'crestix-questionnaire.pages.dev',
    '*.crestix-questionnaire.pages.dev',
  ]);
  assert.deepEqual(nextConfig.experimental?.serverActions?.allowedOrigins, PAGES_PROXY_ALLOWED_ORIGINS);
});

test('serverActions.allowedOrigins does not grant a blanket *.pages.dev or wildcard allowance', () => {
  for (const origin of PAGES_PROXY_ALLOWED_ORIGINS) {
    assert.notEqual(origin, '*');
    assert.notEqual(origin, '*.pages.dev');
  }
});

test('serverActions.allowedOrigins does not list the upstream Worker as a trusted origin', () => {
  assert.equal(PAGES_PROXY_ALLOWED_ORIGINS.includes('survey-pages.hiroyuki-maekawa.workers.dev'), false);
});
