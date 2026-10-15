import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGoogleReviewEligibility} from '../lib/google-review';
import {defaultConfig} from '../lib/survey';

const url='https://example.com/review';
test('disabled・URLなし・不正URLでは口コミCTAを表示しない',()=>{
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'disabled',googleReviewUrl:url},[],{}),false);
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'all',googleReviewUrl:null},[],{}),false);
  assert.equal(evaluateGoogleReviewEligibility({...defaultConfig,googleReviewMode:'all',googleReviewUrl:'javascript:alert(1)'},[],{}),false);
});
const q1='11111111-1111-4111-8111-111111111111';
const q2='22222222-2222-4222-8222-222222222222';
const questions=[q1,q2].map((id,index)=>({id,type:'rating_10' as const,title:`評価${index+1}`,description:'',required:true,sortOrder:index,settings:{maxScore:5 as const},options:[]}));
test('既存score設定はフラグがない限りCTAを全員に表示する',()=>{
  const config={...defaultConfig,googleReviewMode:'score' as const,googleReviewUrl:url,completionRules:[{id:'high',logic:'and' as const,conditions:[{questionId:q1,operator:'gte' as const,value:5}]}]};
  const cases:Record<string,number|string|string[]>[]=[{},{[q1]:1},{[q1]:5}];
  for(const answers of cases)assert.equal(evaluateGoogleReviewEligibility(config,questions,answers),true);
});
test('新しい個別条件では達成時のみ口コミCTAを表示する',()=>{
  const config={...defaultConfig,googleReviewMode:'score' as const,scoreGatesGoogleReview:true,googleReviewUrl:url,completionRules:[{id:'high',logic:'and' as const,conditions:[{questionId:q1,operator:'gte' as const,value:4}]}]};
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1]:4}),true);
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1]:3}),false);
});
test('合計点条件で達成時だけ口コミCTAを表示し、未回答は安全に未達となる',()=>{
  const config={...defaultConfig,googleReviewMode:'score' as const,scoreGatesGoogleReview:true,googleReviewUrl:url,completionRules:[{id:'sum',conditionType:'aggregate' as const,logic:'and' as const,conditions:[],aggregate:{questionIds:[q1,q2],operator:'gte' as const,value:8}}]};
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1]:4,[q2]:4}),true);
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1]:4,[q2]:3}),false);
  assert.equal(evaluateGoogleReviewEligibility(config,questions,{[q1]:4}),false);
});
test('フォローアップ分類は口コミCTAを表示せずallはスコアに影響されない',()=>{
  const gated={...defaultConfig,googleReviewMode:'score' as const,scoreGatesGoogleReview:true,googleReviewUrl:url,completionRules:[{id:'follow-up',logic:'and' as const,conditions:[{questionId:q1,operator:'lte' as const,value:2}],needsFollowUp:true}]};
  assert.equal(evaluateGoogleReviewEligibility(gated,questions,{[q1]:1}),false);
  assert.equal(evaluateGoogleReviewEligibility({...gated,googleReviewMode:'all',scoreGatesGoogleReview:false},questions,{[q1]:1}),true);
});
