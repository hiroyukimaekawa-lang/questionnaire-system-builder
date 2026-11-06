import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('すべての既存編集画面を5ステップ化し、survey.idとslugは維持する',()=>{
  const route=readFileSync(new URL('../app/admin/surveys/[id]/page.tsx',import.meta.url),'utf8');
  assert.match(route,/<SurveyEditorWorkspace[^>]+ fiveStep publicUrl=/);
  assert.match(route,/getDraftForSurvey\(id\)/);
  assert.match(route,/publicSurveyUrl\(appUrl\(\),survey\.slug\)/);
});
test('新編集UIの5ステップは既存の保存フォームを再利用し、画面変更のみ行う',()=>{
  const ui=readFileSync(new URL('../components/admin/SurveyEditorWorkspace.tsx',import.meta.url),'utf8');
  for(const label of ['基本情報','質問作成','Google口コミ設定','デザイン設定','プレビュー・公開'])assert.ok(ui.includes(label),label);
  for(const component of ['BasicForm','ConfigForm','QuestionBuilder','CompletionSettingsForm','PublishSection'])assert.ok(ui.includes('<'+component),component);
  assert.match(ui,/showSection\('basic-information'\)/);
  assert.match(ui,/showSection\('publish-settings'\)/);
  assert.match(ui,/fiveStep\?<nav/);
});
