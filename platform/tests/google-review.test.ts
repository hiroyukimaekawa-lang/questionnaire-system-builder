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
test('口コミCTAは回答スコア・旧score条件・未回答にかかわらず公平に表示する',()=>{
  const config={...defaultConfig,googleReviewMode:'score' as const,googleReviewUrl:url,googleReviewRule:{logic:'and' as const,conditions:[{questionId:'11111111-1111-4111-8111-111111111111',operator:'gte' as const,value:10}]}};
  const cases:Record<string,string|number|string[]>[]=[{}, {'11111111-1111-4111-8111-111111111111':1},{'11111111-1111-4111-8111-111111111111':10}];
  for(const answers of cases)assert.equal(evaluateGoogleReviewEligibility(config,[],answers),true);
});
