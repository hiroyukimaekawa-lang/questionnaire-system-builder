import assert from 'node:assert/strict';
import test from 'node:test';
import {generateSakuyamaAnswerDraft} from '../lib/sakuyama-review-draft';
import type {SurveyQuestion} from '../types/database';

const questions:SurveyQuestion[]=[
  {id:'purpose',type:'single_choice',sortOrder:0,title:'来院目的',description:'',required:true,settings:{},options:[{value:'consultation',label:'診察',sortOrder:0},{value:'both',label:'診察と検査',sortOrder:1}]},
  {id:'medical',type:'rating_10',sortOrder:1,title:'診療満足度',description:'',required:true,settings:{maxScore:5},options:[]},
  {id:'staff',type:'rating_10',sortOrder:2,title:'スタッフ満足度',description:'',required:true,settings:{maxScore:5},options:[]},
  {id:'source',type:'single_choice',sortOrder:3,title:'医院を選んだ理由',description:'',required:false,settings:{},options:[{value:'google',label:'Googleマップ',sortOrder:0}]},
  {id:'free',type:'textarea',sortOrder:4,title:'自由記述',description:'',required:false,settings:{},options:[]},
];

test('5点評価は選択された満足度を文章化し、未確認の具体的な体験を追加しない',()=>{
  const draft=generateSakuyamaAnswerDraft(questions,{purpose:'consultation',medical:5,staff:5,source:'google'});
  assert.match(draft,/診察で受診/);
  assert.match(draft,/診療内容については/);
  assert.match(draft,/スタッフの対応については/);
  assert.match(draft,/Googleマップをきっかけに/);
  assert.doesNotMatch(draft,/先生の説明|看護師|丁寧|安心/);
});

test('低評価を高評価に変えず、見知らぬ回答値から事実を作らない',()=>{
  const draft=generateSakuyamaAnswerDraft(questions,{purpose:'unknown',medical:1,staff:2,source:'notfound'});
  assert.doesNotMatch(draft,/とても満足|非常に良かっ/);
  assert.doesNotMatch(draft,/診察で受診|Googleマップ/);
});

test('未回答なら空の文章を返す',()=>{
  assert.equal(generateSakuyamaAnswerDraft(questions,{}),'');
});
