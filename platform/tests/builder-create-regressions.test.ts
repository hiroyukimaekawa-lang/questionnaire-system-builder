import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RuleBasedBuilderEngine,defaultCompletionText} from '../lib/builder/engine';
import type {BuilderContext} from '../types/database';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');
const engine=new RuleBasedBuilderEngine();

const completeWithoutIntro:BuilderContext={
  purpose:'patient',storeName:'テスト医院',businessType:'clinic',startingPoint:'decided',template:'clinic_standard',
  questions:[{id:'clinic-care',type:'rating_10',title:'診療内容',description:'',required:true,sortOrder:0,settings:{maxScore:10},options:[]}],
  questionsConfirmed:true,anonymous:true,heroTitle:'患者さまアンケート',questionFontSize:17,introText:'',mainColor:'#5E969E',
  logoMode:'none',googleReviewEnabled:false,completionText:defaultCompletionText,
};

test('回答欄前の補足文は任意なので空でもBuilder完成判定を通る',()=>{
  assert.equal(engine.getMissingFields(completeWithoutIntro).includes('introText'),false);
  assert.equal(engine.isComplete(completeWithoutIntro),true);
  assert.equal(engine.getNextStep(completeWithoutIntro)?.id,'summary');
});

test('新規作成APIはテンプレート文字列IDをDB保存前にUUIDへ付け替える',()=>{
  const route=source('app/api/admin/surveys/create-from-builder/route.ts');
  assert.match(route,/questionIdMap=Object\.fromEntries\(context\.questions\.map\(question=>\[question\.id,crypto\.randomUUID\(\)\]\)\)/);
  assert.match(route,/persistedQuestions=context\.questions\.map/);
  assert.match(route,/remapConfigQuestions\(finalConfig,questionIdMap\)/);
  assert.match(route,/for\(const \[index,q\] of persistedQuestions\.entries\(\)\)/);
});

test('未確定エラーは不足項目名を返し、原因不明の400にしない',()=>{
  const route=source('app/api/admin/surveys/create-from-builder/route.ts');
  assert.match(route,/未確定の項目があります：\$\{labels\.join\('、'\)\}/);
  assert.doesNotMatch(route,/return jsonError\('未確定の項目があります。',400\)/);
});
