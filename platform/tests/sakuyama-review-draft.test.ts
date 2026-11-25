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
  assert.match(draft,/診察/);
  assert.match(draft,/診察/);
  assert.match(draft,/診察の内容/);
  assert.match(draft,/スタッフ/);
  // 8点以上ではスプレッドシートの原文を優先し、紹介経路を勝手に補足しない。
  assert.doesNotMatch(draft,/Googleマップをきっかけに/);
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


test('さくやま眼科の24分岐は各5点満点・合計8点以上のみ原文テンプレートを出す',async()=>{
  const {sakuyamaReviewTemplate,sakuyamaReviewTemplates}=await import('../lib/sakuyama-review-templates');
  assert.equal(Object.keys(sakuyamaReviewTemplates).length,24);
  for(const purpose of ['診察','検査','診察と検査','その他']){
    for(let medical=1;medical<=5;medical++)for(let staff=1;staff<=5;staff++){
      const text=sakuyamaReviewTemplate(purpose,medical,staff);
      assert.equal(Boolean(text),medical+staff>=8,`${purpose} ${medical}+${staff}`);
    }
  }
  assert.equal(generateSakuyamaAnswerDraft(questions,{purpose:'consultation',medical:4,staff:4}),sakuyamaReviewTemplate('診察',4,4));
  assert.notEqual(generateSakuyamaAnswerDraft(questions,{purpose:'consultation',medical:3,staff:4}),sakuyamaReviewTemplate('診察',4,4));
});
