import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

test('通常一覧は業種・担当者の独立列を持たず店舗セルへ統合する',()=>{const table=source('components/admin/SurveyListTable.tsx');assert.doesNotMatch(table,/<th[^>]*>業種<\/th>/);assert.doesNotMatch(table,/<th[^>]*>担当者<\/th>/);assert.match(table,/survey\.industry/);assert.match(table,/ownerName/);assert.match(table,/href=\{`\/admin\/surveys\/\$\{survey\.id\}`\}/)});
test('公開中はslug付きURL操作、非公開は未公開を表示する',()=>{const table=source('components/admin/SurveyListTable.tsx');assert.match(table,/survey\.status==='published'/);assert.match(table,/slug=\{survey\.slug\}/);assert.match(table,/>未公開</)});
test('案件管理は要件どおり4つのstatus filterを持つ',()=>{const page=source('app/admin/manage/page.tsx');for(const label of ['すべて','公開中','作成途中','停止中'])assert.match(page,new RegExp(`'${label}'`));for(const status of ['published','draft','unpublished'])assert.match(page,new RegExp(`'${status}'`))});
test('draft filterはSupabase側でdraftとunpublishedをまとめる',()=>assert.match(source('lib/management.ts'),/filters\.status==='draft'[\s\S]*?\.in\('status',\['draft','unpublished'\]\)/));
test('削除済み一覧は補足情報を店舗セルにまとめ通常操作を出さない',()=>{const table=source('components/admin/ArchivedSurveyTable.tsx');assert.match(table,/>削除済み</);assert.match(table,/survey\.slug/);assert.match(table,/survey\.industry/);assert.match(table,/owner\?\.name\|\|owner\?\.email/);assert.doesNotMatch(table,/>編集</);assert.doesNotMatch(table,/>公開</);assert.doesNotMatch(table,/>複製</)});
