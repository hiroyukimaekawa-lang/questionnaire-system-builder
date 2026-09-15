import assert from 'node:assert/strict';
import test from 'node:test';
import {builderConfig,recommendedReviewRule,reviewComment,remapConfigQuestions,reviewRuleDescription} from '../lib/builder/settings';
import type {SurveyConfig,SurveyQuestion} from '../types/database';

const questions:SurveyQuestion[]=[
  {id:'11111111-1111-4111-8111-111111111111',type:'rating_10',title:'待ち時間',description:'',required:true,sortOrder:0,settings:{maxScore:10},options:[]},
  {id:'22222222-2222-4222-8222-222222222222',type:'rating_10',title:'スタッフ対応',description:'',required:true,sortOrder:1,settings:{maxScore:10},options:[]},
  {id:'33333333-3333-4333-8333-333333333333',type:'textarea',title:'ご感想',description:'',required:false,sortOrder:2,settings:{},options:[]},
];

test('おすすめ口コミ条件は全スコア質問をOR・9点以上にする',()=>{
  const rule=recommendedReviewRule(questions);
  assert.equal(rule.logic,'or');
  assert.deepEqual(rule.conditions.map(c=>[c.questionId,c.operator,c.value]),[
    [questions[0].id,'gte',9],[questions[1].id,'gte',9],
  ]);
  assert.match(reviewRuleDescription(rule,questions),/待ち時間.*9点以上.*スタッフ対応.*9点以上.*いずれか1つ/);
});

test('指定した長文質問だけを口コミ文章として使用し、使用しない設定も扱う',()=>{
  const answers={[questions[2].id]:'回答者本人の文章'};
  assert.equal(reviewComment({reviewTextQuestionId:questions[2].id} as SurveyConfig,questions,answers),'回答者本人の文章');
  assert.equal(reviewComment({reviewTextQuestionId:null} as SurveyConfig,questions,answers),'');
});

test('複製・公開後の新しい質問IDへ口コミ条件と文章質問を付け替える',()=>{
  const config={googleReviewRule:{logic:'and',conditions:[{questionId:questions[0].id,operator:'gte',value:9}]},completionRules:[{id:'r',logic:'and',conditions:[{questionId:questions[1].id,operator:'lte',value:5}]}],reviewTextQuestionId:questions[2].id} as SurveyConfig;
  const mapped=remapConfigQuestions(config,{[questions[0].id]:'new-1',[questions[1].id]:'new-2',[questions[2].id]:'new-3'});
  assert.equal(mapped.googleReviewRule?.conditions[0].questionId,'new-1');
  assert.equal(mapped.completionRules?.[0].conditions[0].questionId,'new-2');
  assert.equal(mapped.reviewTextQuestionId,'new-3');
});

test('新規Builderは説明文をヒーローだけに表示し本文補足は初期OFF',()=>{
  const config=builderConfig({businessType:'restaurant'});
  assert.ok(config.heroSubtitle?.trim());
  assert.equal(config.description,'');
  assert.equal(config.introText,'');
});

test('旧Builderで説明文とヒーロー説明が重複していても本文側を自動で消す',()=>{
  const config=builderConfig({businessType:'restaurant',config:{heroSubtitle:'同じ説明',description:'同じ説明',introText:''} as SurveyConfig});
  assert.equal(config.heroSubtitle,'同じ説明');
  assert.equal(config.description,'');
  assert.equal(config.introText,'');
});

test('旧Builderの本文専用説明は補足文へ移して編集可能にする',()=>{
  const config=builderConfig({businessType:'restaurant',config:{heroSubtitle:'上部説明',description:'本文だけの説明',introText:''} as SurveyConfig});
  assert.equal(config.description,'');
  assert.equal(config.introText,'本文だけの説明');
});
