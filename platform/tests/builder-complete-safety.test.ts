import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

test('completeはAction rejectをcatchしsurveyIdがある場合だけ遷移する',()=>{
  const ui=source('components/builder/BuilderWorkspace.tsx');
  const complete=ui.slice(ui.indexOf('const complete='),ui.indexOf('const version='));
  assert.match(complete,/try\{const result=await completeBuilderAction/);
  assert.match(complete,/if\(result\.surveyId\)\{router\.push\(`\/admin\/surveys\/\$\{result\.surveyId\}`\);return;\}/);
  assert.match(complete,/catch\{setSaveStatus\('error'\)/);
  assert.equal((complete.match(/router\.push/g)??[]).length,1);
});

test('作成中はボタンをdisabledにする',()=>{
  const ui=source('components/builder/BuilderWorkspace.tsx');
  assert.match(ui,/disabled=\{pending\} onClick=\{complete\}>\{pending\?'作成中…':'この内容で作成'\}/);
});

test('新規作成画面に詳細を表示しない再試行可能なerror boundaryがある',()=>{
  const path='app/admin/surveys/new/error.tsx';
  assert.equal(existsSync(join(root,path)),true);
  const boundary=source(path);
  assert.match(boundary,/'use client'/);
  assert.match(boundary,/onClick=\{reset\}/);
  assert.match(boundary,/アンケート管理へ戻る/);
  assert.doesNotMatch(boundary,/error\.message|error\.stack|Supabase|secret/i);
});

test('作成Actionは後処理updateのerrorを無視せず、技術詳細を返さない',()=>{
  const actions=source('app/actions.ts');
  const complete=actions.slice(actions.indexOf('export async function completeBuilderAction'),actions.indexOf('export async function saveCompletionSettingsAction'));
  assert.match(complete,/error:surveyUpdateError[^]*if\(surveyUpdateError\)throw surveyUpdateError/);
  assert.match(complete,/error:sessionUpdateError[^]*if\(sessionUpdateError\)throw sessionUpdateError/);
  assert.doesNotMatch(complete,/e instanceof Error\?e\.message/);
  assert.doesNotMatch(complete,/\.delete\(/);
});
