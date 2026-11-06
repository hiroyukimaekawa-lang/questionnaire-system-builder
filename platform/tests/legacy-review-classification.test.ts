import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvedCompletionRules,evaluateCompletionRules} from '../lib/completion';
import {evaluateGoogleReviewEligibility} from '../lib/google-review';
import {defaultConfig} from '../lib/survey';
import type {SurveyConfig,SurveyQuestion,GoogleReviewRule} from '../types/database';

const scoreQuestion=(id:string,maxScore:5|10):SurveyQuestion=>({
  id,type:'rating_10',title:id,description:'',required:true,sortOrder:0,settings:{maxScore},options:[],
});
const makeLegacy=(logic:'and'|'or', conditions:GoogleReviewRule['conditions']):SurveyConfig=>({
  ...defaultConfig,completionText:'完了',googleReviewMode:'score',googleReviewUrl:'https://example.com/review',
  googleReviewRule:{logic,conditions},completionRules:[],
});

test('旧形式のAND/OR閾値は新UIの内部評価分類へ読み替えられる',()=>{
  const cases=[
    {name:'SANGLIER',logic:'and' as const,thresholds:[4,4,4],hit:[4,4,4],miss:[4,3,4]},
    {name:'スタッフ様デモ',logic:'or' as const,thresholds:[7,7],hit:[6,7],miss:[6,6]},
    {name:'むくもと眼科',logic:'or' as const,thresholds:[1,1,9],hit:[1,1,8],miss:[0,0,8]},
    {name:'清水眼科',logic:'and' as const,thresholds:[8,8,8],hit:[8,8,8],miss:[8,7,8]},
    {name:'笠井眼科',logic:'and' as const,thresholds:[1,1,9],hit:[1,1,9],miss:[1,1,8]},
    {name:'鴻巣北本内科',logic:'or' as const,thresholds:[5,5],hit:[5,3],miss:[4,4]},
  ];
  for(const c of cases){
    const ids=c.thresholds.map((_,i)=>'q'+i),rules=c.thresholds.map((value,i)=>({questionId:ids[i],operator:'gte' as const,value}));
    const config=makeLegacy(c.logic,rules);
    const questions=ids.map((id,i)=>scoreQuestion(id,c.thresholds[i]<=5?5:10));
    assert.equal(resolvedCompletionRules(config).length,1,c.name);
    assert.notEqual(evaluateCompletionRules(config,Object.fromEntries(c.hit.map((n,i)=>[ids[i],n])),questions).matchedRuleId,null,c.name+' match');
    assert.equal(evaluateCompletionRules(config,Object.fromEntries(c.miss.map((n,i)=>[ids[i],n])),questions).matchedRuleId,null,c.name+' miss');
    assert.equal(evaluateGoogleReviewEligibility(config,questions,Object.fromEntries(c.miss.map((n,i)=>[ids[i],n]))),false,c.name+' below threshold');
    assert.equal(evaluateGoogleReviewEligibility(config,questions,Object.fromEntries(c.hit.map((n,i)=>[ids[i],n]))),true,c.name+' at threshold');
  }
});
test('新形式の評価分類は旧条件より優先し、旧設定を勝手に書き換えない',()=>{
 const config=makeLegacy('and',[{questionId:'q0',operator:'gte',value:9}]);
 config.completionRules=[{id:'new',logic:'and',conditions:[{questionId:'q0',operator:'gte',value:5}]}];
 assert.equal(resolvedCompletionRules(config)[0].id,'new');
 assert.equal(config.googleReviewRule?.conditions[0].value,9);
});
test('旧条件を内部分類に復元しても公開アンケートURLやQR生成方法は変更しない',()=>{
 const publicUrl=readFileSync(new URL('../lib/public-url.ts',import.meta.url),'utf8');
 const qr=readFileSync(new URL('../components/admin/PublicUrlActions.tsx',import.meta.url),'utf8');
 assert.match(publicUrl,/\/s\/\$\{slug\}/);
 assert.match(qr,/QRCode\.toDataURL\(url,/);
});

test('デモ管理の合計13点以上を維持し、点数条件で口コミCTAを判定する',()=>{
 const config={
   ...defaultConfig,googleReviewMode:'score',googleReviewUrl:'https://example.com/review',completionText:'完了',
   completionRules:[{id:'aggregate-13',logic:'and',conditions:[],conditionType:'aggregate',aggregate:{operator:'gte',questionIds:['q1','q2'],value:13},needsFollowUp:false}],
 };
 const questions=[scoreQuestion('q1',10),scoreQuestion('q2',10)];
 assert.equal(evaluateCompletionRules(config,{q1:7,q2:6},questions).matchedRuleId,'aggregate-13');
 assert.equal(evaluateCompletionRules(config,{q1:6,q2:6},questions).matchedRuleId,null);
 assert.equal(evaluateGoogleReviewEligibility(config,questions,{q1:6,q2:6}),false);
 assert.equal(evaluateGoogleReviewEligibility(config,questions,{q1:7,q2:6}),true);
});
