import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGoogleReviewEligibility} from '../lib/google-review';
import {defaultConfig} from '../lib/survey';
import type {SurveyQuestion} from '../types/database';

const q1:SurveyQuestion={id:'11111111-1111-4111-8111-111111111111',type:'rating_10',title:'待ち時間',description:'',required:true,sortOrder:0,settings:{maxScore:10},options:[]};
const q2:SurveyQuestion={id:'22222222-2222-4222-8222-222222222222',type:'rating_10',title:'スタッフ対応',description:'',required:true,sortOrder:1,settings:{maxScore:10},options:[]};
const text:SurveyQuestion={id:'33333333-3333-4333-8333-333333333333',type:'text',title:'自由入力',description:'',required:false,sortOrder:2,settings:{},options:[]};
const questions=[q1,q2,text];
const url='https://example.com/review';

test('disabledまたはURLなしでは口コミCTAを表示しない',()=>{
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'disabled',googleReviewUrl:url},questions,{[q1.id]:10,[q2.id]:10}),false);
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'score',googleReviewUrl:null,googleReviewRule:{logic:'and',conditions:[{questionId:q1.id,operator:'gte',value:9}]}},questions,{[q1.id]:10}),false);
});

test('allはスコアに関係なく表示する',()=>{
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'all',googleReviewUrl:url},questions,{[q1.id]:1,[q2.id]:1}),true);
});

test('score ANDは各質問が個別に成立した場合だけ表示する',()=>{
  const config={...defaultConfig,googleReviewMode:'score' as const,googleReviewUrl:url,googleReviewRule:{logic:'and' as const,conditions:[{questionId:q1.id,operator:'gte' as const,value:9},{questionId:q2.id,operator:'gte' as const,value:9}]}};
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1.id]:9,[q2.id]:9}),true);
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1.id]:10,[q2.id]:8}),false);
});

test('score ORはいずれかの条件が成立すれば表示する',()=>{
  const config={...defaultConfig,googleReviewMode:'score' as const,googleReviewUrl:url,googleReviewRule:{logic:'or' as const,conditions:[{questionId:q1.id,operator:'gte' as const,value:9},{questionId:q2.id,operator:'gte' as const,value:9}]}};
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1.id]:8,[q2.id]:9}),true);
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1.id]:8,[q2.id]:8}),false);
});

test('scoreは未回答・非rating質問・不正な条件では安全側に倒す',()=>{
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'score',googleReviewUrl:url,googleReviewRule:{logic:'and',conditions:[{questionId:q2.id,operator:'gte',value:9}]}},questions,{[q1.id]:10}),false);
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'score',googleReviewUrl:url,googleReviewRule:{logic:'and',conditions:[{questionId:text.id,operator:'gte',value:1}]}},questions,{[text.id]:10}),false);
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'score',googleReviewUrl:url,googleReviewRule:null},questions,{[q1.id]:10}),false);
});

test('5点満点の質問でも設定した閾値で判定する',()=>{
  const five={...q1,settings:{maxScore:5 as const}};
  const config={...defaultConfig,googleReviewMode:'score' as const,googleReviewUrl:url,googleReviewRule:{logic:'and' as const,conditions:[{questionId:five.id,operator:'gte' as const,value:4}]}};
  assert.equal(evaluateGoogleReviewEligibility(config,[five],{[five.id]:4}),true);
  assert.equal(evaluateGoogleReviewEligibility(config,[five],{[five.id]:3}),false);
  assert.equal(evaluateGoogleReviewEligibility({...config,googleReviewRule:{logic:'and',conditions:[{questionId:five.id,operator:'gte',value:6}]}},[five],{[five.id]:5}),false);
});

test('旧conditional/googleReviewRulesもAND条件として安全に評価する',()=>{
  const legacy={...defaultConfig,googleReviewUrl:url,googleReviewMode:'conditional',googleReviewRules:[{id:'legacy',logic:'and',conditions:[{questionId:q1.id,operator:'gte',value:9},{questionId:q2.id,operator:'gte',value:9}]}]} as any;
  assert.equal(evaluateGoogleReviewEligibility(legacy,questions,{[q1.id]:9,[q2.id]:9}),true);
  assert.equal(evaluateGoogleReviewEligibility(legacy,questions,{[q1.id]:10,[q2.id]:8}),false);
});
