import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleBasedBuilderEngine, defaultCompletionText, defaultIntroText } from '../lib/builder/engine';
import type { BuilderContext } from '../types/database';

const engine=new RuleBasedBuilderEngine();
const completeBase:BuilderContext={purpose:'patient',storeName:'テスト医院',businessType:'clinic',startingPoint:'none',template:'clinic_standard',questions:[],questionsConfirmed:true,anonymous:true,introText:defaultIntroText(true),mainColor:'#5E969E',logoMode:'none',googleReviewEnabled:false,completionText:defaultCompletionText};

test('目的から始まり業種までは機械的な質問文を聞かない',()=>{assert.equal(engine.getNextStep({})?.id,'purpose');assert.equal(engine.getNextStep({purpose:'patient'})?.id,'storeName');assert.equal(engine.getNextStep({purpose:'patient',storeName:'医院'})?.id,'businessType')});
test('業種によりクリニック標準テンプレートを提案する',()=>{const step=engine.getNextStep({purpose:'patient',storeName:'医院',businessType:'clinic',startingPoint:'none'});assert.equal(step?.id,'template');assert.ok(step?.options?.some(x=>x.value==='clinic_standard'))});
test('既存内容がほぼ決まっていても固定質問列ではなくテンプレート選択へ進む',()=>{assert.equal(engine.getNextStep({purpose:'satisfaction',storeName:'店',businessType:'restaurant',startingPoint:'decided'})?.id,'template')});
test('テンプレート選択で質問を生成しゼロ入力を省く',()=>{const c=engine.applyAnswer({purpose:'patient',storeName:'医院',businessType:'clinic',startingPoint:'none'},'template','clinic_standard');assert.equal(c.questions?.length,5);assert.equal(engine.getNextStep(c)?.id,'questionsConfirmed')});
test('Google口コミ不要ならURL質問をスキップする',()=>{const c={...completeBase,questions:[{id:'q',type:'text' as const,title:'質問',description:'',required:true,sortOrder:0,settings:{},options:[]}]};assert.equal(engine.getNextStep(c)?.id,'summary');assert.ok(!engine.getMissingFields(c).includes('googleReviewUrl'))});
test('Google口コミを有効にした場合だけURLを不足判定する',()=>{const c={...completeBase,googleReviewEnabled:true};assert.ok(engine.getMissingFields(c).includes('googleReviewUrl'));assert.equal(engine.getNextStep(c)?.id,'questions')});
test('必要情報が揃うまで未完成、揃えば完成',()=>{assert.equal(engine.isComplete({}),false);const c={...completeBase,questions:[{id:'q',type:'text' as const,title:'質問',description:'',required:true,sortOrder:0,settings:{},options:[]}]};assert.equal(engine.isComplete(c),true)});
test('業種の過去回答を修正すると依存項目だけ再計算する',()=>{const before={...completeBase,questions:[{id:'q',type:'text' as const,title:'質問',description:'',required:true,sortOrder:0,settings:{},options:[]}]};const after=engine.applyAnswer(before,'businessType','restaurant');assert.equal(after.businessType,'restaurant');assert.equal(after.template,undefined);assert.equal(after.questions,undefined);assert.equal(after.mainColor,'#5E969E')});
test('ロゴなしならアップロード質問をしない',()=>{const c={...completeBase,questions:[{id:'q',type:'text' as const,title:'質問',description:'',required:true,sortOrder:0,settings:{},options:[]}]};assert.ok(!engine.getMissingFields(c).includes('logoUrl'))});
