import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Apps ScriptはSurvey IDで店舗タブを管理し回答を追記する',()=>{
  const script=read('../integrations/google-sheets/Code.gs');
  assert.match(script,/TAB_STORE_SHEETS = '店舗タブ管理'/);
  assert.match(script,/findExactInColumn\(registry, 1, store\.id\)/);
  assert.match(script,/appendStoreResponse\(ss, store, response, answers\)/);
  assert.match(script,/sheet\.getRange\(sheet\.getLastRow\(\) \+ 1, 1, 1, row\.length\)\.setValues/);
});

test('削除時は店舗タブを非表示、復元時は再表示する',()=>{
  const script=read('../integrations/google-sheets/Code.gs');
  const actions=read('../app/actions.ts');
  assert.match(script,/body\.action === 'survey_archived'/);
  assert.match(script,/sheet\.hideSheet\(\)/);
  assert.match(script,/sheet\.showSheet\(\)/);
  assert.match(actions,/syncStore\('survey_archived',data\)/);
  assert.match(actions,/syncStore\('survey_restored',data\)/);
  assert.doesNotMatch(actions,/archiveAction[\s\S]*?\.delete\(/);
});

test('すべてのアンケート作成経路で店舗タブ作成イベントを送る',()=>{
  const actions=read('../app/actions.ts');
  const route=read('../app/api/admin/surveys/create-from-builder/route.ts');
  assert.ok((actions.match(/syncStore\('survey_created'/g)??[]).length>=3);
  assert.match(route,/buildGoogleSheetsStorePayload\('survey_created'/);
});

test('回答を数式として実行せずWebhook secretを一定時間で比較する',()=>{
  const script=read('../integrations/google-sheets/Code.gs');
  assert.match(script,/\^\[=\+\\-@\\t\\r\]/);
  assert.match(script,/constantTimeEqual\(String\(body\.secret\), expectedSecret\)/);
  assert.match(script,/Utilities\.computeDigest\(Utilities\.DigestAlgorithm\.SHA_256/);
});
