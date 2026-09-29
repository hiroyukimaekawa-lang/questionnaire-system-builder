import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {improvementProposalDraftSchema, assistantContextSchema} from '../lib/assistant/schema';

const root = join(import.meta.dirname, '..');
const source = (path: string) => readFileSync(join(root, path), 'utf8');

test('1/2: authorizeAssistantRequestは未ログイン401、非staff/非activeを403として扱う', () => {
  const auth = source('lib/assistant/auth.ts');
  assert.match(auth, /authError \|\| !user\) return \{error: 'ログインが必要です。', status: 401\}/);
  assert.match(auth, /!profile\.is_active\) return \{error: '権限がありません。', status: 403\}/);
  assert.match(auth, /profile\.role !== 'admin' && profile\.role !== 'sales'\) return \{error: '権限がありません。', status: 403\}/);
});

test('3: chat routeは全リクエストでauthorizeAssistantRequestを通し、失敗時はそのstatusを返す', () => {
  const route = source('app/api/internal-assistant/chat/route.ts');
  assert.match(route, /const auth = await authorizeAssistantRequest\(\)/);
  assert.match(route, /isAssistantAuthError\(auth\)\) return NextResponse\.json\(\{error: auth\.error\}, \{status: auth\.status\}\)/);
});

test('4: improvements routeも同じ認可ゲートを通る', () => {
  const route = source('app/api/internal-assistant/improvements/route.ts');
  assert.match(route, /const auth = await authorizeAssistantRequest\(\)/);
  assert.match(route, /isAssistantAuthError\(auth\)\) return NextResponse\.json\(\{error: auth\.error\}, \{status: auth\.status\}\)/);
});

test('rate limit: 両routeともcheckRateLimitを通す', () => {
  assert.match(source('app/api/internal-assistant/chat/route.ts'), /checkRateLimit\(`chat:\$\{auth\.user\.id\}`\)/);
  assert.match(source('app/api/internal-assistant/improvements/route.ts'), /checkRateLimit\(`improvements:\$\{auth\.user\.id\}`\)/);
});

test('38: improvements routeはidempotency keyで重複送信を防ぐ', () => {
  const route = source('app/api/internal-assistant/improvements/route.ts');
  assert.match(route, /idempotencyKey = request\.headers\.get\('x-idempotency-key'\)/);
  assert.match(route, /eq\('reporter_user_id', auth\.user\.id\)\s*\n\s*\.eq\('idempotency_key', idempotencyKey\)/);
  assert.match(route, /23505/);
});

test('userRole is server-authoritative: both routes overwrite context.userRole with the verified role', () => {
  assert.match(source('app/api/internal-assistant/chat/route.ts'), /const context = \{\.\.\.input\.context, userRole: auth\.role\}/);
  assert.match(source('app/api/internal-assistant/improvements/route.ts'), /const context = \{\.\.\.input\.context, userRole: auth\.role\}/);
});

test('9/19-24: contextスキーマは自動添付禁止項目(respondent answers/PII/secrets)を一切含まない', () => {
  const shape = Object.keys(assistantContextSchema.shape);
  assert.deepEqual(shape.sort(), ['activeSection', 'appCommitSha', 'draftVersionId', 'environment', 'pagePath', 'pageType', 'surveyId', 'system', 'userRole'].sort());
  for (const forbidden of ['answers', 'respondentName', 'cookie', 'authorization', 'token', 'apiKey', 'serviceRole', 'password']) {
    assert.equal(shape.some(key => key.toLowerCase().includes(forbidden.toLowerCase())), false, `context schema must not carry a "${forbidden}" field`);
  }
});

test('proposal schema carries no respondent PII fields either', () => {
  const shape = Object.keys(improvementProposalDraftSchema.shape);
  for (const forbidden of ['answers', 'respondentName', 'password', 'token']) {
    assert.equal(shape.some(key => key.toLowerCase().includes(forbidden.toLowerCase())), false);
  }
});

test('7: feature flagは既定でoffで、layoutはflag+role確認後にのみ内部AssistantをserverでゲートしてからMountする', () => {
  const flags = source('lib/feature-flags.ts');
  assert.match(flags, /readBooleanFlag\('QUESTIONNAIRE_INTERNAL_ASSISTANT_ENABLED', false\)/);
  const layout = source('app/admin/layout.tsx');
  assert.match(layout, /const showAssistant=isInternalAssistantEnabled\(\)&&\(profile\.role==='admin'\|\|profile\.role==='sales'\)/);
  assert.match(layout, /\{showAssistant&&<AssistantMount /);
});

test('AssistantMountはssr:falseで遅延読み込みし、無効時はチャンク自体を参照しない', () => {
  const mount = source('components/assistant/AssistantMount.tsx');
  assert.match(mount, /dynamic\(\(\) => import\('\.\/AssistantRoot'\)\.then\(m => m\.AssistantRoot\), \{ssr: false\}\)/);
});

test('AssistantRootはrole再確認(viewer等はnullを返す)する', () => {
  const rootSource = source('components/assistant/AssistantRoot.tsx');
  assert.match(rootSource, /if \(role !== 'admin' && role !== 'sales'\) return null;/);
});
