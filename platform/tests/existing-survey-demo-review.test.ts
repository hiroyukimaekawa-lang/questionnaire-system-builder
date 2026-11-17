import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {isGoogleSearchDemoReviewUrl} from '../lib/google-review';

test('既存アンケート編集STEP3でも商談デモURLの明示切替を使える',()=>{
  const settings=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  const form=readFileSync(new URL('../components/admin/CompletionSettingsForm.tsx',import.meta.url),'utf8');
  const action=readFileSync(new URL('../app/completion-actions.ts',import.meta.url),'utf8');
  assert.match(form,/<ReviewSettings allowDemoToggle/);
  assert.match(settings,/name="demoGoogleReviewLink"/);
  assert.match(settings,/商談デモ用（PCでの提案）/);
  assert.match(action,/form\.get\('demoGoogleReviewLink'\) === 'true'/);
  assert.match(action,/isGoogleSearchDemoReviewUrl\(reviewUrl\)/);
  assert.match(action,/config\.demoGoogleReviewLink = demoRequested/);
});
test('商談デモ旧Google検索リンクは#lrd付きのみ対象',()=>{
  assert.equal(isGoogleSearchDemoReviewUrl('https://www.google.com/search?q=0883357128#lrd=0x3553ba893c604cc5:0x9b8d62f9f9d9eb1f,3,,,,'),true);
  assert.equal(isGoogleSearchDemoReviewUrl('https://www.google.com/search?q=0883357128'),false);
});
test('古い評価質問IDの保存エラーでは再設定手順を案内する',()=>{
  const form=readFileSync(new URL('../components/admin/CompletionSettingsForm.tsx',import.meta.url),'utf8');
  assert.match(form,/state\.error\.includes\('現在の下書きに存在する評価質問'\)/);
});
