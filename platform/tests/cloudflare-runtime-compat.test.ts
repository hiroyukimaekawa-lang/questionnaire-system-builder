import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const patch = readFileSync(
  new URL('../patches/@opennextjs+cloudflare+1.20.11.patch', import.meta.url),
  'utf8',
);
const canonicalSurveyRoute = readFileSync(new URL('../app/[slug]/page.tsx', import.meta.url), 'utf8');

test('Next 16.4 の preview-props manifest を OpenNext Worker bundle へ含める', () => {
  assert.equal(packageJson.dependencies.next, '16.4.0');
  assert.equal(packageJson.dependencies['@opennextjs/cloudflare'], '1.20.11');
  assert.equal(packageJson.scripts.postinstall, 'patch-package');
  assert.equal(packageJson.devDependencies['patch-package'], '8.0.1');
  assert.match(patch, /prefetch-hints,preview-props/);
});

test('Next route segment config は再exportせずルート内で静的宣言する', () => {
  assert.match(canonicalSurveyRoute, /export const dynamic = 'force-dynamic'/);
  assert.doesNotMatch(canonicalSurveyRoute, /export \{[^}]*dynamic/);
});
