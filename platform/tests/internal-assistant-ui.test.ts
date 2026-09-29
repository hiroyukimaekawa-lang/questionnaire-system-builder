import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root = join(import.meta.dirname, '..');
const source = (path: string) => readFileSync(join(root, path), 'utf8');

test('6: launcher button opens the drawer (dialog role)', () => {
  const rootSource = source('components/assistant/AssistantRoot.tsx');
  assert.match(rootSource, /className="assistant-launcher"/);
  assert.match(rootSource, /aria-haspopup="dialog"/);
  const drawer = source('components/assistant/AssistantDrawer.tsx');
  assert.match(drawer, /role="dialog" aria-modal="true"/);
});

test('7: Enterで送信、Shift+Enterで改行する', () => {
  const drawer = source('components/assistant/AssistantDrawer.tsx');
  assert.match(drawer, /if \(event\.key === 'Enter' && !event\.shiftKey\) \{/);
  assert.match(drawer, /event\.preventDefault\(\);\s*\n\s*void send\(input\);/);
});

test('Escで閉じ、Tabはdrawer内でフォーカストラップする', () => {
  const drawer = source('components/assistant/AssistantDrawer.tsx');
  assert.match(drawer, /event\.key === 'Escape'\) \{ onClose\(\); return; \}/);
  assert.match(drawer, /event\.key !== 'Tab' \|\| !drawerRef\.current/);
});

test('9: 送信中は「入力中…」を表示する', () => {
  assert.match(source('components/assistant/AssistantDrawer.tsx'), />入力中…</);
});

test('10: 失敗時は「回答を取得できませんでした。」+再送ボタンを表示する', () => {
  const drawer = source('components/assistant/AssistantDrawer.tsx');
  assert.match(drawer, /回答を取得できませんでした。/);
  assert.match(drawer, />再送</);
  assert.match(drawer, /onClick=\{retry\}/);
});

test('11: 初回だけ4つのsuggested promptを表示し、自由入力も常に可能', () => {
  const drawer = source('components/assistant/AssistantDrawer.tsx');
  assert.match(drawer, /この画面の使い方を教えて/);
  assert.match(drawer, /Google口コミ設定について教えて/);
  assert.match(drawer, /アンケートの公開方法を教えて/);
  assert.match(drawer, /ここが使いづらい/);
  assert.match(drawer, /const showSuggestions = history\.length === 0/);
  assert.match(drawer, /<textarea[\s\S]*?aria-label="メッセージを入力"/);
});

test('12: 直近20 messageまでをsessionStorageへ保持し、respondent PIIは扱わない', () => {
  const drawer = source('components/assistant/AssistantDrawer.tsx');
  assert.match(drawer, /const MAX_HISTORY = 20/);
  assert.match(drawer, /window\.sessionStorage\.setItem\(HISTORY_KEY/);
  assert.match(drawer, /window\.sessionStorage\.getItem\(HISTORY_KEY\)/);
});

test('改善要望の確認ボタンは明示的な送信操作でのみImprovement APIを叩く', () => {
  const drawer = source('components/assistant/AssistantDrawer.tsx');
  assert.match(drawer, /'改善要望として送る'/);
  assert.match(drawer, />今回は送らない</);
  assert.match(drawer, /fetch\('\/api\/internal-assistant\/improvements'/);
  assert.match(drawer, /'x-idempotency-key': idempotencyKeyRef\.current/);
});

test('13: mobileでdrawerがほぼfull-screenになり、composerは下部固定・messagesだけscrollする', () => {
  const css = source('app/assistant.css');
  assert.match(css, /@media\(max-width:640px\)\{/);
  assert.match(css, /\.assistant-drawer\{width:100%;height:100dvh\}/);
  assert.match(css, /\.assistant-messages\{flex:1;overflow-y:auto/);
});

test('draft版の回答方法selectと同様、日本語の見出し・本文にword-break:break-allを使わない', () => {
  const css = source('app/assistant.css');
  assert.doesNotMatch(css, /word-break:\s*break-all/);
  assert.match(css, /word-break:normal;overflow-wrap:anywhere/);
});
