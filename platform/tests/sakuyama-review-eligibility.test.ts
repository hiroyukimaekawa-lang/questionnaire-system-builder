import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {isSakuyamaReviewEligible} from '../lib/sakuyama-review-eligibility';
import {ThanksPanel} from '../components/survey/ThanksPanel';
import {readFileSync} from 'node:fs';

const medical='11111111-1111-4111-8111-111111111111';
const staff='22222222-2222-4222-8222-222222222222';
const questions=[
  {id:medical,type:'rating_10' as const,sortOrder:1,settings:{maxScore:5 as const}},
  {id:staff,type:'rating_10' as const,sortOrder:2,settings:{maxScore:5 as const}},
] as any;

test('さくやま眼科は合計8点以上のみ口コミ対象',()=>{
  for(const [a,b,expected] of [[5,5,true],[5,3,true],[4,4,true],[3,5,true],[5,2,false],[4,3,false],[1,1,false]] as const){
    assert.equal(isSakuyamaReviewEligible(questions,{[medical]:a,[staff]:b}),expected,`${a}+${b}`);
  }
  assert.equal(isSakuyamaReviewEligible(questions,{[medical]:5}),false);
  assert.equal(isSakuyamaReviewEligible(questions,{[medical]:5,[staff]:0}),false);
});

const render=(slug:string,eligible:boolean)=>renderToStaticMarkup(React.createElement(ThanksPanel,{
  slug,text:'ご回答ありがとうございました',reviewMode:'all',reviewUrl:'https://example.com/review',
  primaryColor:'#123456',previewCompletion:{reviewEligible:eligible,generated:eligible,comment:eligible?'良かったです。':''},
}));

test('さくやま眼科7点以下は通常サンクス画面のみ',()=>{
  const html=render('survey-1793862622762',false);
  assert.match(html,/ご回答/);
  assert.doesNotMatch(html,/Googleで感想を書く/);
  assert.doesNotMatch(html,/口コミ用の文章/);
  assert.doesNotMatch(html,/thanks-review-block/);
});

test('さくやま眼科8点以上は口コミ文案とGoogle案内を表示',()=>{
  const html=render('survey-1793862622762',true);
  assert.match(html,/口コミ用の文章/);
  assert.match(html,/Googleで感想を書く/);
});

test('他医院の全員表示設定は変更されない',()=>{
  const html=render('another-clinic',false);
  assert.match(html,/Google口コミを書く/);
});

test('回答保存と営業テストの両方で同じ8点条件が使われる',()=>{
  const source=readFileSync(new URL('../components/survey/SurveyRenderer.tsx',import.meta.url),'utf8');
  assert.match(source,/const sakuyamaReviewEligible = sakuyamaDemo && isSakuyamaReviewEligible\(version.questions,answers\)/);
  assert.match(source,/reviewEligible: sakuyamaDemo \? sakuyamaReviewEligible : json.reviewEligible === true/);
  assert.match(source,/sakuyamaDemo && !sakuyamaReviewEligible/);
});
