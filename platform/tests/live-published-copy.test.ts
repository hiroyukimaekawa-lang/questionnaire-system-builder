import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {changedPublishedCopy,mergeSurveyConfig} from '../lib/config';
import {defaultConfig} from '../lib/survey';

test('公開版に反映するのは今回変更した文章だけ（デザイン、質問、口コミURLを含めない）',()=>{
 const before={...defaultConfig,title:'旧タイトル',completionText:'旧完了',googleReviewUrl:'https://example.com/old',primaryColor:'#123456'};
 const after={...before,title:'新タイトル',completionText:'新完了',googleReviewUrl:'https://example.com/new',primaryColor:'#abcdef'};
 const patch=changedPublishedCopy(before,after);
 assert.deepEqual(patch,{title:'新タイトル',completionText:'新完了'});
 const published={...before,googleReviewUrl:'https://example.com/live',primaryColor:'#654321'};
 const result=mergeSurveyConfig(published,patch);
 assert.equal(result.title,'新タイトル');
 assert.equal(result.completionText,'新完了');
 assert.equal(result.googleReviewUrl,'https://example.com/live');
 assert.equal(result.primaryColor,'#654321');
});
test('回答後文言・口コミ案内文も反映でき、何も変更しない保存は空パッチ',()=>{
 const before={...defaultConfig,googleReviewPromptText:'旧文'};
 assert.deepEqual(changedPublishedCopy(before,{...before,googleReviewPromptText:'新文',introText:'新冒頭'}),{introText:'新冒頭',googleReviewPromptText:'新文'});
 assert.deepEqual(changedPublishedCopy(before,before),{});
});
test('文章保存は公開中の文章のみ更新して公開URLを再検証し、下書き質問の自動公開はしない',()=>{
 const src=readFileSync(new URL('../app/actions.ts',import.meta.url),'utf8');
 const start=src.indexOf('export async function saveConfigAction');
 const end=src.indexOf('export async function saveQuestionsAction');
 const action=src.slice(start,end);
 assert.match(action,/changedPublishedCopy\(current\.config/);
 assert.match(action,/survey\.status==='published'/);
 assert.match(action,/\.eq\('status','published'\)/);
 assert.match(action,/revalidatePath\(`\/s\/\$\{survey\.slug\}\/thanks`\)/);
 assert.doesNotMatch(action,/publish_survey/);
});
