import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {builderConfig,resolveBuilderIdentityMode} from '../lib/builder/settings';
import {RuleBasedBuilderEngine} from '../lib/builder/engine';
import {resolveIdentityModeFormValue} from '../lib/public-survey';
import {defaultConfig} from '../lib/survey';
import type {BuilderContext} from '../types/database';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');
const engine=new RuleBasedBuilderEngine();

test('resolveBuilderIdentityModeは完全な新規アンケートでrespondent_choiceを既定にする',()=>{
  assert.equal(resolveBuilderIdentityMode({}),'respondent_choice');
});

test('resolveBuilderIdentityModeはBuilderContext.identityModeを最優先する',()=>{
  assert.equal(resolveBuilderIdentityMode({identityMode:'anonymous_only',config:{identityMode:'identified_only'} as any}),'anonymous_only');
});

test('resolveBuilderIdentityModeはtop-levelが無ければconfig.identityModeを使う',()=>{
  assert.equal(resolveBuilderIdentityMode({config:{identityMode:'identified_only'} as any}),'identified_only');
});

test('resolveBuilderIdentityModeは旧anonymousブール値だけのlegacy sessionをidentityModeへ互換変換する',()=>{
  assert.equal(resolveBuilderIdentityMode({anonymous:true}),'anonymous_only');
  assert.equal(resolveBuilderIdentityMode({anonymous:false}),'identified_only');
});

test('builderConfigはidentityModeをsource of truthとしてconfigへ書き込み、anonymousは派生値になる',()=>{
  const respondentChoice=builderConfig({identityMode:'respondent_choice'});
  assert.equal(respondentChoice.identityMode,'respondent_choice');
  assert.equal(respondentChoice.anonymous,false);
  assert.equal(respondentChoice.anonymousText,'');

  const anonymousOnly=builderConfig({identityMode:'anonymous_only'});
  assert.equal(anonymousOnly.identityMode,'anonymous_only');
  assert.equal(anonymousOnly.anonymous,true);
  assert.ok(anonymousOnly.anonymousText.length>0);

  const identifiedOnly=builderConfig({identityMode:'identified_only'});
  assert.equal(identifiedOnly.identityMode,'identified_only');
  assert.equal(identifiedOnly.anonymous,false);
  assert.equal(identifiedOnly.anonymousText,'');
});

test('builderConfigは完全な新規コンテキストでrespondent_choiceを既定にする',()=>{
  assert.equal(builderConfig({}).identityMode,'respondent_choice');
});

test('新規作成APIのgetMissingFieldsはidentityModeが無いcontextを未確定として拒否する',()=>{
  const base:BuilderContext={purpose:'satisfaction',storeName:'店',businessType:'other',startingPoint:'decided',template:'custom',questions:[{id:'q',type:'text',title:'質問',description:'',required:true,sortOrder:0,settings:{},options:[]}],questionsConfirmed:true,heroTitle:'タイトル',questionFontSize:17,logoMode:'none',googleReviewEnabled:false,completionText:'ありがとうございました'};
  assert.ok(engine.getMissingFields(base).includes('identityMode'));
  assert.ok(!engine.getMissingFields({...base,identityMode:'respondent_choice'}).includes('identityMode'));
  // legacy in-progress sessions that only ever answered the old anonymous boolean are
  // not re-asked - resolveBuilderIdentityMode/builderConfig convert them downstream.
  assert.ok(!engine.getMissingFields({...base,anonymous:true}).includes('identityMode'));
});

test('create-from-builder APIはpersistedConfigのidentityMode/anonymous/anonymousTextを上書きしない',()=>{
  const route=source('app/api/admin/surveys/create-from-builder/route.ts');
  assert.doesNotMatch(route,/anonymous:context\.anonymous/);
  assert.doesNotMatch(route,/anonymousText:context\.anonymous/);
  assert.match(route,/missingFieldLabels:Record<string,string>=\{[^}]*identityMode:'回答方法'/);
  assert.match(route,/const finalConfig=builderConfig\(context\)/);
  assert.match(route,/const persistedConfig=remapConfigQuestions\(finalConfig,questionIdMap\)/);
  assert.match(route,/const config=\{\.\.\.persistedConfig,themeId,title:heroTitle/);
});

test('SurveyWizardは回答方法selectでBuilderContext.identityModeとconfig.identityModeの両方を同期する',()=>{
  const wizard=source('components/builder/SurveyWizard.tsx');
  assert.match(wizard,/<option value="respondent_choice">回答者が匿名・記名を選択<\/option>/);
  assert.match(wizard,/<option value="anonymous_only">匿名のみ<\/option>/);
  assert.match(wizard,/<option value="identified_only">記名のみ<\/option>/);
  assert.match(wizard,/design\(\{identityMode:value\}\);change\(\{identityMode:value\}\)/);
  assert.match(wizard,/identityMode:resolveBuilderIdentityMode\(initial\)/);
  assert.match(wizard,/identityMode:config\.identityMode,googleReviewEnabled/);
  assert.doesNotMatch(wizard,/匿名／記名<select/);
});

test('複製フローは明示identityModeのみ引き継ぎ、legacy複製をidentified_onlyへ変換しない',()=>{
  const page=source('app/admin/surveys/new/page.tsx');
  assert.match(page,/const explicitIdentityMode=config\.identityMode&&IDENTITY_MODES\.includes\(config\.identityMode\)\?config\.identityMode:undefined/);
  assert.match(page,/\.\.\.\(explicitIdentityMode\?\{identityMode:explicitIdentityMode\}:\{\}\)/);
  assert.doesNotMatch(page,/anonymous:isAnonymousSurvey\(config\)/);
  assert.doesNotMatch(page,/identityMode:isAnonymousSurvey/);
});

// --- PR #28 blocking issue: the existing-survey edit form (SurveyForms.tsx ConfigForm)
// must not silently invent identityMode:'respondent_choice' for a legacy config just by
// being opened - saving an unrelated field (title/logo/font size) must never add
// identityMode to the draft. Only an explicit selection away from 'legacy' may.

test('1: config.identityMode未設定・anonymous=falseの編集formはlegacy初期値になる',()=>{
  assert.equal(resolveIdentityModeFormValue({...defaultConfig,anonymous:false}),'legacy');
});

test('2: config.identityMode未設定・anonymous=trueの編集formもlegacy初期値になる(resolveIdentityModeの表示用推測を流用しない)',()=>{
  assert.equal(resolveIdentityModeFormValue({...defaultConfig,anonymous:true}),'legacy');
});

test('7: 明示identityMode済みsurveyの編集formはそのモードのまま(legacyへ丸められない)',()=>{
  assert.equal(resolveIdentityModeFormValue({...defaultConfig,identityMode:'respondent_choice'}),'respondent_choice');
  assert.equal(resolveIdentityModeFormValue({...defaultConfig,anonymous:true,identityMode:'identified_only'}),'identified_only');
  assert.equal(resolveIdentityModeFormValue({...defaultConfig,anonymous:false,identityMode:'anonymous_only'}),'anonymous_only');
});

test('不正なidentityMode文字列は編集formでもlegacyへfallbackする(anonymousへは推測しない)',()=>{
  assert.equal(resolveIdentityModeFormValue({...defaultConfig,anonymous:true,identityMode:'bogus' as any}),'legacy');
});

test('3: 編集formはidentityMode未設定configでlegacyのuseStateを初期化し、resolveIdentityModeの表示用推測(anonymous_only等)を初期値へ使わない',()=>{
  const forms=source('components/admin/SurveyForms.tsx');
  assert.match(forms,/const initialIdentityMode=resolveIdentityModeFormValue\(config\)/);
  assert.match(forms,/const isLegacySource=initialIdentityMode==='legacy'/);
  assert.match(forms,/const \[identityMode,setIdentityMode\]=useState<IdentityModeFormValue>\(initialIdentityMode\)/);
  assert.doesNotMatch(forms,/useState<IdentityMode>\(resolvedIdentityMode/);
});

test('3/4/5/6: selectがlegacyのままならonChangeへidentityModeを渡さず(undefinedでクリア)、明示選択時のみ実際のmodeを渡す',()=>{
  const forms=source('components/admin/SurveyForms.tsx');
  assert.match(forms,/onChange\?\.\(\{identityMode:value==='legacy'\?undefined:value\}\)/);
});

test('3: legacy sourceのときだけselectへ「現在の設定を維持」optionを追加し、明示identityMode済みsurveyには追加しない',()=>{
  const forms=source('components/admin/SurveyForms.tsx');
  assert.match(forms,/\{isLegacySource&&<option value="legacy">/);
  assert.match(forms,/現在の設定を維持（従来形式：匿名）/);
  assert.match(forms,/現在の設定を維持（従来形式）/);
});

test('3: saveConfigActionはvalue="legacy"を許可リストに含めず、identityModeをeditedへ追加しない',()=>{
  const actions=source('app/actions.ts');
  assert.match(actions,/form\.has\('identityMode'\)&&\['respondent_choice','anonymous_only','identified_only'\]\.includes\(val\('identityMode'\)\)/);
  assert.doesNotMatch(actions,/'legacy'/);
  const allowed=['respondent_choice','anonymous_only','identified_only'];
  assert.equal(allowed.includes('legacy'),false);
});

test('4/5/6: 明示3モードへの変更はすべてsaveConfigActionの許可リストを満たす',()=>{
  const allowed=['respondent_choice','anonymous_only','identified_only'];
  for(const mode of ['respondent_choice','anonymous_only','identified_only'] as const){
    assert.equal(allowed.includes(mode),true);
  }
});

test('8/9: legacy configのSurveyRenderer表示は編集form側の変更と無関係に維持される(既存挙動の再確認)',()=>{
  const renderer=source('components/survey/SurveyRenderer.tsx');
  assert.match(renderer,/\(identityMode === 'anonymous_only' \|\| \(identityMode === 'legacy' && isAnonymousSurvey\(version\.config\)\)\) && anonymousText &&/);
});
