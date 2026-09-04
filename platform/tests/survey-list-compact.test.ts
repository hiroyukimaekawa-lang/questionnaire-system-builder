import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

test('通常一覧は業種・担当者の独立列を持たず店舗セルへ統合する',()=>{const table=source('components/admin/SurveyListTable.tsx');assert.doesNotMatch(table,/<th[^>]*>業種<\/th>/);assert.doesNotMatch(table,/<th[^>]*>担当者<\/th>/);assert.match(table,/survey\.industry/);assert.match(table,/ownerName/);assert.match(table,/href=\{`\/admin\/surveys\/\$\{survey\.id\}`\}/)});
test('公開中はslug付きURL操作、非公開は未公開を表示する',()=>{const table=source('components/admin/SurveyListTable.tsx');assert.match(table,/survey\.status==='published'/);assert.match(table,/slug=\{survey\.slug\}/);assert.match(table,/>未公開</)});
test('status tabsは正しい6項目とURLを持つ',()=>{const page=source('app/admin/page.tsx');for(const label of ['すべて','作成途中','下書き','公開中','回答あり','削除済み'])assert.match(page,new RegExp(`label:'${label}'`));for(const href of ['/admin','/admin?status=in_progress','/admin?status=draft','/admin?status=published','/admin?status=responses','/admin?status=archived'])assert.ok(page.includes(`href:'${href}'`))});
test('draft filterはdraftとunpublishedをまとめる',()=>assert.match(source('app/admin/page.tsx'),/filter==='draft'\?\(item\.status==='draft'\|\|item\.status==='unpublished'\)/));
test('削除済み一覧は補足情報を店舗セルにまとめ通常操作を出さない',()=>{const table=source('components/admin/ArchivedSurveyTable.tsx');assert.match(table,/>削除済み</);assert.match(table,/survey\.slug/);assert.match(table,/survey\.industry/);assert.match(table,/owner\?\.name\|\|owner\?\.email/);assert.doesNotMatch(table,/>編集</);assert.doesNotMatch(table,/>公開</);assert.doesNotMatch(table,/>複製</)});
