import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editBuilderHistory,summaryEditStepId,type BuilderHistoryEntry} from '../components/builder/builderNavigation';
import {reopenBuilderStep} from '../components/builder/builderPreview';
import {ruleBasedBuilderEngine as engine} from '../lib/builder/engine';
import type {BuilderContext} from '../types/database';

function fixture(){
  let context:BuilderContext={};
  const history:BuilderHistoryEntry[]=[];
  for(const value of ['satisfaction','テスト店舗','clinic','none','clinic_standard','confirmed','true','アンケート',19,'none','false']){
    const step=engine.getNextStep(context)!;
    history.push({step,value,label:String(value)});
    context=engine.applyAnswer(context,step.id,value);
  }
  assert.equal(engine.getNextStep(context)?.id,'summary');
  return {context,history};
}

test('historyが0件・範囲外なら戻れない',()=>{
  assert.equal(editBuilderHistory({},[]),null);
  const {context,history}=fixture();
  for(const index of [-1,history.length,0.5])assert.equal(editBuilderHistory(context,history,index),null);
});
test('直前の質問へ戻り、回答し直して後続の分岐を再計算する',()=>{
  const {context,history}=fixture();
  const result=editBuilderHistory(context,history)!;
  assert.equal(engine.getNextStep(result.context)?.id,'googleReviewEnabled');
  assert.equal(result.history.length,history.length-1);
  assert.deepEqual(result.context.questions,context.questions);
  assert.equal(result.context.storeName,context.storeName);
  assert.equal(result.context.anonymous,true);
  assert.equal(result.context.mainColor,context.mainColor);
  const next=engine.applyAnswer(result.context,'googleReviewEnabled','true');
  assert.equal(engine.getNextStep(next)?.id,'googleReviewUrl');
  assert.equal(engine.getNextStep(engine.applyAnswer(next,'googleReviewUrl','https://example.com'))?.id,'summary');
  assert.equal(context.googleReviewEnabled,false);
});
test('任意の過去回答を変更し、必要な依存項目のみ再回答する',()=>{
  const {context,history}=fixture();
  const result=editBuilderHistory(context,history,2)!;
  assert.equal(engine.getNextStep(result.context)?.id,'businessType');
  assert.equal(result.history.length,2);
  assert.equal(result.context.questions,undefined);
  assert.equal(result.context.template,undefined);
  assert.equal(result.context.storeName,context.storeName);
  assert.equal(result.context.anonymous,context.anonymous);
  const next=engine.applyAnswer(result.context,'businessType','restaurant');
  assert.equal(engine.getNextStep(next)?.id,'template');
});
test('1件の履歴から最初に戻って回答し直せる',()=>{
  const step=engine.getNextStep({})!;
  const result=editBuilderHistory({purpose:'satisfaction'},[{step,value:'satisfaction',label:'満足度'}])!;
  assert.equal(engine.getNextStep(result.context)?.id,'purpose');
  assert.equal(result.history.length,0);
  assert.equal(engine.getNextStep(engine.applyAnswer(result.context,'purpose','other'))?.id,'purposeDetail');
});
test('summaryは履歴がない保存済みcontextからも修正できる',()=>{
  const {context}=fixture();
  const reopened=reopenBuilderStep(context,summaryEditStepId);
  assert.equal(engine.getNextStep(reopened)?.id,summaryEditStepId);
  assert.deepEqual(reopened.questions,context.questions);
  const next=engine.applyAnswer(reopened,summaryEditStepId,'ありがとうございました');
  assert.equal(next.completionText,'ありがとうございました');
  assert.equal(engine.getNextStep(next)?.id,'summary');
});
test('自作質問へ戻っても質問文・設定を保持して再回答できる',()=>{
  const {context}=fixture();
  context.template='custom';
  const next=reopenBuilderStep(context,'questions');
  assert.equal(engine.getNextStep(next)?.id,'questions');
  assert.deepEqual(next.questions,context.questions);
  assert.equal(engine.getNextStep(engine.applyAnswer(next,'questions',next.questions))?.id,'summary');
});
test('戻るUI・任意変更・summary導線を接続しbrowser history APIを使わない',()=>{
  const source=readFileSync(new URL('../components/builder/BuilderWorkspace.tsx',import.meta.url),'utf8');
  assert.match(source,/history.length>0\?<button className="btn secondary builder-back-button"/);
  assert.match(source,/onClick=\{\(\)=>edit\(history.length-1\)\}/);
  assert.match(source,/onClick=\{\(\)=>edit\(index\)\}>変更/);
  assert.match(source,/← ひとつ前に戻る/);
  assert.match(source,/← 前の項目に戻る/);
  assert.match(source,/onClick=\{reviseSummary\}>内容を修正する/);
  assert.match(source,/これまでの回答を見る/);
  assert.doesNotMatch(source,/\b(?:window\.)?history\s*\.\s*(?:back|forward|go|pushState|replaceState)\s*\(|router\s*\.\s*back\s*\(/);
});
