import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGoogleSheetsPayload} from '../lib/google-sheets-sync';
import {defaultConfig} from '../lib/survey';
import type {SurveyVersion} from '../types/database';

const q1={id:'11111111-1111-4111-8111-111111111111',type:'rating_10' as const,title:'待ち時間',description:'',required:true,sortOrder:0,settings:{maxScore:10 as const},options:[]};
const q2={id:'22222222-2222-4222-8222-222222222222',type:'rating_10' as const,title:'スタッフ対応',description:'',required:true,sortOrder:1,settings:{maxScore:10 as const},options:[]};
const q3={id:'33333333-3333-4333-8333-333333333333',type:'textarea' as const,title:'ご意見',description:'',required:false,sortOrder:2,settings:{},options:[]};
const version:SurveyVersion={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',surveyId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',version:4,status:'published',config:{...defaultConfig,title:'来院後アンケート',googleReviewUrl:'https://example.com/review'},questions:[q1,q2,q3]};
const publicSurvey={survey:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',name:'サンプル医院',slug:'sample-clinic',industry:'clinic',status:'published'},version};

test('回答をGoogle Sheets用の一覧・詳細・イベントpayloadへ変換する',()=>{
  const payload=buildGoogleSheetsPayload({publicSurvey,answers:{[q1.id]:10,[q2.id]:8,[q3.id]:'丁寧でした'},responseId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',submittedAt:'2026-09-07T12:00:00.000Z',completion:{needsFollowUp:true},reviewEligible:false});
  assert.equal(payload.store.name,'サンプル医院');
  assert.equal(payload.response.surveyName,'来院後アンケート');
  assert.equal(payload.response.totalScore,18);
  assert.equal(payload.response.averageScore,9);
  assert.equal(payload.response.reviewEligible,false);
  assert.equal(payload.response.needsFollowUp,true);
  assert.equal(payload.answers.length,3);
  assert.deepEqual(payload.answers.slice(0,2).map(row=>row.score),[10,8]);
  assert.equal(payload.events[0].type,'response_submitted');
});

test('評価質問がなければ平均・合計スコアはnullにする',()=>{
  const textVersion={...version,questions:[q3]};
  const payload=buildGoogleSheetsPayload({publicSurvey:{...publicSurvey,version:textVersion},answers:{[q3.id]:'回答'},responseId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',submittedAt:'2026-09-07T12:00:00.000Z',completion:{},reviewEligible:false});
  assert.equal(payload.response.totalScore,null);
  assert.equal(payload.response.averageScore,null);
});
