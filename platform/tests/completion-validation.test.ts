import test from 'node:test';import assert from 'node:assert/strict';import {completionRulesSchema,googleReviewRuleSchema,normalizeGoogleReviewRuleForQuestions,parseCompletionRulesJson,parseGoogleReviewRuleJson,validateGoogleReviewRuleForQuestions,validateRulesForQuestions} from '../lib/completion-validation';import type {SurveyQuestion} from '../types/database';
const makeQuestion=(id:string,maxScore:5|10,sortOrder=0):SurveyQuestion=>({id,type:'rating_10',title:'score',description:'',required:true,sortOrder,settings:{maxScore},options:[]});const id='11111111-1111-4111-8111-111111111111',id2='22222222-2222-4222-8222-222222222222',id3='33333333-3333-4333-8333-333333333333',oldId='44444444-4444-4444-8444-444444444444';
test('valid completion rule parses',()=>assert.equal(parseCompletionRulesJson(JSON.stringify([{id:'r',logic:'and',conditions:[{questionId:id,operator:'gte',value:5}],completionMessage:'ok',needsFollowUp:false}])).length,1));
test('invalid operator and logic are rejected',()=>{assert.equal(completionRulesSchema.safeParse([{id:'r',logic:'xor',conditions:[{questionId:id,operator:'gte',value:1}]}]).success,false);assert.equal(completionRulesSchema.safeParse([{id:'r',logic:'and',conditions:[{questionId:id,operator:'gt',value:1}]}]).success,false);assert.equal(googleReviewRuleSchema.safeParse({logic:'xor',conditions:[{questionId:id,operator:'gte',value:1}]}).success,false)});
test('rule and condition maximums are enforced',()=>{const base={id:'r',logic:'and',conditions:[{questionId:id,operator:'gte',value:1}]};assert.equal(completionRulesSchema.safeParse(Array.from({length:21},(_,i)=>({...base,id:String(i)}))).success,false);assert.equal(completionRulesSchema.safeParse([{...base,conditions:Array.from({length:11},()=>base.conditions[0])}]).success,false);assert.equal(googleReviewRuleSchema.safeParse({logic:'and',conditions:Array.from({length:11},()=>base.conditions[0])}).success,false)});
test('question ownership and score maximum are enforced',()=>{const rules=parseCompletionRulesJson(JSON.stringify([{id:'r',logic:'and',conditions:[{questionId:id,operator:'gte',value:6}]}]));assert.match(validateRulesForQuestions(rules,[makeQuestion(id,5)])??'',/1〜5/);assert.equal(validateRulesForQuestions(rules,[makeQuestion(id,10)]),null);assert.match(validateRulesForQuestions(rules,[makeQuestion(id2,10)])??'',/現在の下書き/)});
test('Google口コミ表示条件もrating質問と最大点を検証する',()=>{const rule=parseGoogleReviewRuleJson(JSON.stringify({logic:'and',conditions:[{questionId:id,operator:'gte',value:6}]}));assert.match(validateGoogleReviewRuleForQuestions(rule,[makeQuestion(id,5)])??'',/1〜5/);assert.equal(validateGoogleReviewRuleForQuestions(rule,[makeQuestion(id,10)]),null)});
test('Google口コミ条件はAND/ORどちらも質問ごとの個別基準点を許可する',()=>{
  const questions=[makeQuestion(id,5,0),makeQuestion(id2,5,1),makeQuestion(id3,5,2)];
  const conditions=[{questionId:id,operator:'gte' as const,value:4},{questionId:id2,operator:'gte' as const,value:3},{questionId:id3,operator:'gte' as const,value:2}];
  assert.equal(validateGoogleReviewRuleForQuestions({logic:'or',conditions},questions),null);
  assert.equal(validateGoogleReviewRuleForQuestions({logic:'and',conditions},questions),null);
});
test('Google口コミ条件はgte・重複なし・全評価質問1回ずつを必須にする',()=>{
  const questions=[makeQuestion(id,5,0),makeQuestion(id2,5,1)];
  assert.match(validateGoogleReviewRuleForQuestions({logic:'and',conditions:[{questionId:id,operator:'eq',value:5},{questionId:id2,operator:'gte',value:5}]},questions)??'',/○点以上/);
  assert.match(validateGoogleReviewRuleForQuestions({logic:'or',conditions:[{questionId:id,operator:'gte',value:5},{questionId:id,operator:'gte',value:5}]},questions)??'',/重複/);
  assert.match(validateGoogleReviewRuleForQuestions({logic:'and',conditions:[{questionId:id,operator:'gte',value:5}]},questions)??'',/すべての評価質問/);
});
test('既存アンケートの古い質問ID・不足質問・重複は現在の評価質問へ自動補正する',()=>{
  const questions=[makeQuestion(id,5,0),makeQuestion(id2,5,1),makeQuestion(id3,10,2)];
  const oldRule={logic:'and' as const,conditions:[
    {questionId:id,operator:'gte' as const,value:4},
    {questionId:id,operator:'gte' as const,value:2},
    {questionId:oldId,operator:'gte' as const,value:5},
  ]};
  const normalized=normalizeGoogleReviewRuleForQuestions(oldRule,questions);
  assert.equal(normalized.logic,'and');
  assert.deepEqual(normalized.conditions.map(c=>[c.questionId,c.operator,c.value]),[
    [id,'gte',4],[id2,'gte',5],[id3,'gte',9],
  ]);
  assert.equal(validateGoogleReviewRuleForQuestions(normalized,questions),null);
});
test('口コミ条件が未設定でも現在の評価質問からORの安全な初期条件を作る',()=>{
  const questions=[makeQuestion(id,5,0),makeQuestion(id2,10,1)];
  const normalized=normalizeGoogleReviewRuleForQuestions(null,questions);
  assert.equal(normalized.logic,'or');
  assert.deepEqual(normalized.conditions.map(c=>c.value),[5,9]);
});
