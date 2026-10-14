import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCompletionRules} from '../lib/completion';
import {parseCompletionRulesJson,validateRulesForQuestions} from '../lib/completion-validation';
import {defaultConfig} from '../lib/survey';
import type {CompletionRule,SurveyQuestion} from '../types/database';

const q=(id:string,maxScore:5|10=5):SurveyQuestion=>({id,type:'rating_10',title:id,description:'',required:false,sortOrder:0,settings:{maxScore},options:[]});
const q1=q('11111111-1111-4111-8111-111111111111'),q2=q('22222222-2222-4222-8222-222222222222'),q3=q('33333333-3333-4333-8333-333333333333');
const aggregate:CompletionRule={id:'aggregate',conditionType:'aggregate',logic:'and',conditions:[],aggregate:{questionIds:[q1.id,q2.id],operator:'gte',value:8}};
const evaluate=(answers:Record<string,number>)=>evaluateCompletionRules({...defaultConfig,completionRules:[aggregate]},answers,[q1,q2,q3]).matchedRuleId;

test('合計点は10・8なら達成し7なら未達',()=>{assert.equal(evaluate({[q1.id]:5,[q2.id]:5}),'aggregate');assert.equal(evaluate({[q1.id]:5,[q2.id]:3}),'aggregate');assert.equal(evaluate({[q1.id]:4,[q2.id]:3}),null)});
test('対象外質問は合計せず3項目以上も判定する',()=>{assert.equal(evaluate({[q1.id]:4,[q2.id]:3,[q3.id]:5}),null);const rule={...aggregate,aggregate:{questionIds:[q1.id,q2.id,q3.id],operator:'gte' as const,value:12}};assert.equal(evaluateCompletionRules({...defaultConfig,completionRules:[rule]},{[q1.id]:5,[q2.id]:4,[q3.id]:3},[q1,q2,q3]).matchedRuleId,'aggregate')});
test('未回答・文字列・小数・範囲外は条件未達',()=>{for(const answers of [{[q1.id]:5},{[q1.id]:5,[q2.id]:'3'},{[q1.id]:5,[q2.id]:3.5},{[q1.id]:5,[q2.id]:6}] as any[])assert.equal(evaluateCompletionRules({...defaultConfig,completionRules:[aggregate]},answers,[q1,q2,q3]).matchedRuleId,null)});
test('設定JSONは再読込でき、最大合計点と質問所有を検証する',()=>{const parsed=parseCompletionRulesJson(JSON.stringify([aggregate]));assert.deepEqual(parsed[0],{...aggregate,needsFollowUp:false});assert.equal(validateRulesForQuestions(parsed,[q1,q2,q3]),null);const invalid=parseCompletionRulesJson(JSON.stringify([{...aggregate,aggregate:{...aggregate.aggregate!,value:11}}]));assert.match(validateRulesForQuestions(invalid,[q1,q2,q3])??'',/1〜10/)});
test('既存の個別AND・OR条件は従来通り',()=>{const individual=(logic:'and'|'or'):CompletionRule=>({id:logic,logic,conditions:[{questionId:q1.id,operator:'gte',value:4},{questionId:q2.id,operator:'gte',value:4}]});assert.equal(evaluateCompletionRules({...defaultConfig,completionRules:[individual('and')]},{[q1.id]:4,[q2.id]:3},[q1,q2]).matchedRuleId,null);assert.equal(evaluateCompletionRules({...defaultConfig,completionRules:[individual('or')]},{[q1.id]:4,[q2.id]:3},[q1,q2]).matchedRuleId,'or')});
