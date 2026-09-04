import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

test('/adminはアンケート管理に統合されsidebarの重複項目とview=surveysを持たない',()=>{
  const sidebar=source('components/admin/AdminSidebar.tsx'),page=source('app/admin/page.tsx');
  assert.match(sidebar,/>アンケート管理</);assert.doesNotMatch(sidebar,/>ダッシュボード</);assert.doesNotMatch(sidebar,/>アンケート一覧</);assert.doesNotMatch(sidebar,/view=surveys/);assert.match(page,/<h1>\{filter==='archived'\?'削除済み':'アンケート管理'\}/);
});

test('published・draft・unpublishedをsoft deleteし関連回答をDELETEしない',()=>{
  const actions=source('app/actions.ts');
  const archive=actions.slice(actions.indexOf('export async function archiveAction'),actions.indexOf('export async function restoreSurveyAction'));
  assert.match(archive,/update\(\{status:'archived'/);assert.match(archive,/neq\('status','archived'\)/);assert.doesNotMatch(archive,/\.delete\(/);
});

test('通常一覧はarchivedを除外し削除済みfilterだけに表示する',()=>{
  const page=source('app/admin/page.tsx');assert.match(page,/filter==='archived'\?allSurveysRaw\.filter\(item=>item\.status==='archived'\):allSurveysRaw\.filter\(item=>item\.status!=='archived'\)/);
});

test('archived status labelは削除済みで通常操作を持たない',()=>{assert.match(source('components/admin/SurveyListTable.tsx'),/archived:'削除済み'/);const archived=source('components/admin/ArchivedSurveyTable.tsx');assert.doesNotMatch(archived,/>編集</);assert.doesNotMatch(archived,/>公開</);assert.doesNotMatch(archived,/>複製</);assert.match(archived,/復元する/)});

test('公開取得はpublishedだけを返しarchivedを返さない',()=>assert.match(source('lib/data.ts'),/eq\('status','published'\)/));

test('復元はadmin限定かつarchivedからunpublishedにだけ戻す',()=>{
  const actions=source('app/actions.ts');assert.match(actions,/restoreSurveyAction/);assert.match(actions,/p\.role!=='admin'/);assert.match(actions,/update\(\{status:'unpublished',archived_at:null/);assert.match(actions,/eq\('status','archived'\)/);assert.doesNotMatch(actions,/restoreSurveyAction[\s\S]*?update\(\{status:'published'/);
});

test('削除と復元のserver actionはsalesを拒否しadminを許可する条件を持つ',()=>{
  const actions=source('app/actions.ts');const archive=actions.slice(actions.indexOf('export async function archiveAction'),actions.indexOf('export async function restoreSurveyAction')),restore=actions.slice(actions.indexOf('export async function restoreSurveyAction'),actions.indexOf('export async function duplicateSurveyAction'));
  assert.match(archive,/p\.role!=='admin'/);assert.match(restore,/p\.role!=='admin'/);
});

test('操作メニューはadminだけに最下部の削除を表示しarchiveActionを使う',()=>{const menu=source('components/admin/SurveyActionsMenu.tsx');assert.match(menu,/role==='admin'/);assert.match(menu,/archiveAction\.bind\(null,surveyId\)/);assert.match(menu,/回答データは削除されません/);assert.ok(menu.indexOf('label="削除する"')>menu.indexOf('publishAction.bind'))});

test('archiveActionは回答・質問・版を物理DELETEしない',()=>{const actions=source('app/actions.ts'),archive=actions.slice(actions.indexOf('export async function archiveAction'),actions.indexOf('export async function restoreSurveyAction'));assert.doesNotMatch(archive,/responses|response_answers|survey_versions|questions|question_options/);assert.doesNotMatch(archive,/delete\(/)});
