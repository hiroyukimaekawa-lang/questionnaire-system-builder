import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {publicSurveyUrl} from '../lib/public-url';
import {evaluateGoogleReviewEligibility} from '../lib/google-review';
import type {SurveyConfig,SurveyQuestion} from '../types/database';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

test('QRコードの公開URLはslug固定で、新旧の設定変更に依存しない',()=>{
  const url=publicSurveyUrl('https://questionnaire.survey-system.workers.dev','survey-1790666185058');
  assert.equal(url,'https://questionnaire.survey-system.workers.dev/s/survey-1790666185058');
  const actions=source('components/admin/PublicUrlActions.tsx');
  assert.match(actions,/QRCode\.toDataURL\(url,/);
  assert.match(source('app/s/\[slug\]/page.tsx'),/getPublicSurvey\(slug\)/);
});

test('新規作成のSTEP4設定はcanonical化され、作成APIで引き継がれる',()=>{
  const wizard=source('components/builder/SurveyWizard.tsx');
  const route=source('app/api/admin/surveys/create-from-builder/route.ts');
  assert.match(wizard,/mainColor:config\.primaryColor/);
  assert.match(wizard,/logoMode:config\.logoMode/);
  assert.match(wizard,/logoUrl:config\.logoUrl/);
  assert.match(wizard,/config:\{\.\.\.config,description:''\}/);
  assert.match(route,/const persistedConfig=remapConfigQuestions\(finalConfig,questionIdMap\)/);
  assert.match(route,/const config=\{\.\.\.persistedConfig,/);
  assert.match(route,/primaryColor:context\.mainColor!/);
  assert.match(route,/logoMode:context\.logoMode,logoUrl:context\.logoUrl\?\?null/);
});

test('ローカルUI確認用ではDB保存と公開処理を実行しない',()=>{
  const wizard=source('components/builder/SurveyWizard.tsx');
  assert.match(wizard,/if\(previewOnly\)\{setMessage\('UIプレビューでは保存できません。'\);return;\}/);
  assert.match(wizard,/if\(previewOnly\)\{setMessage\('UIプレビューでは作成・公開できません。'\);return;\}/);
});

test('公開回答APIはversion一致を検証し、DB保存成功時のみ201を返す',()=>{
  const api=source('app/api/responses/route.ts');
  const renderer=source('components/survey/SurveyRenderer.tsx');
  assert.match(api,/publicSurvey\.version\.id!==input\.versionId/);
  assert.match(api,/s\.rpc\('submit_survey_response'/);
  assert.match(api,/if\(error\)return NextResponse\.json/);
  assert.match(api,/reviewEligible\},\{status:201\}/);
  assert.match(renderer,/if \(!response\.ok\) throw new Error/);
  assert.match(renderer,/router\.push\(`\/s\/\$\{slug\}\/thanks`\)/);
});

test('点数条件の内部判定を8点未達・9点達成の境界値で確認する',()=>{
  const question:SurveyQuestion={id:'q3',type:'rating_10',title:'おすすめ度',description:'',required:true,sortOrder:0,settings:{maxScore:10},options:[]};
  const config={googleReviewUrl:'https://example.com/reviews',googleReviewMode:'score',scoreGatesGoogleReview:true,completionText:'回答ありがとうございました',completionRules:[{id:'r1',logic:'and',conditions:[{questionId:'q3',operator:'gte',value:9}]}]} as SurveyConfig;
  assert.equal(evaluateGoogleReviewEligibility(config,[question],{q3:8}),false);
  assert.equal(evaluateGoogleReviewEligibility(config,[question],{q3:9}),true);
  assert.equal(evaluateGoogleReviewEligibility(config,[question],{q3:10}),true);
});
