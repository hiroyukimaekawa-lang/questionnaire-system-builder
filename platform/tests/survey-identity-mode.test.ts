import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {readFileSync} from 'node:fs';
import {SurveyRenderer} from '../components/survey/SurveyRenderer';
import {isAnonymousSurvey,resolveIdentityMode} from '../lib/public-survey';
import {displayIdentity} from '../lib/responses';
import {defaultConfig} from '../lib/survey';
import type {SurveyConfig} from '../types/database';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const render=(config:Partial<SurveyConfig>)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{} as any},React.createElement(SurveyRenderer,{name:'テスト店舗',slug:'test',preview:true,version:{id:'v',config:{...defaultConfig,...config},questions:[]} as any})));

test('既存 anonymous=trueはanonymous_onlyへ、anonymous=falseや未設定はlegacyへ後方互換変換する',()=>{
  assert.equal(resolveIdentityMode({...defaultConfig,anonymous:true}),'anonymous_only');
  assert.equal(resolveIdentityMode({...defaultConfig,anonymous:false}),'legacy');
  assert.equal(resolveIdentityMode({...defaultConfig,anonymousText:'こちらのアンケートは匿名です。'}),'legacy');
  assert.equal(resolveIdentityMode({...defaultConfig,anonymousText:'回答内容は運営者が確認します。'}),'legacy');
});

test('identityModeが明示されていれば旧anonymousより優先する',()=>{
  assert.equal(resolveIdentityMode({...defaultConfig,anonymous:true,identityMode:'identified_only'}),'identified_only');
  assert.equal(resolveIdentityMode({...defaultConfig,anonymous:false,identityMode:'anonymous_only'}),'anonymous_only');
  assert.equal(resolveIdentityMode({...defaultConfig,identityMode:'respondent_choice'}),'respondent_choice');
});

test('不正なidentityMode文字列は無視して旧anonymousへfallbackする',()=>{
  assert.equal(resolveIdentityMode({...defaultConfig,anonymous:true,identityMode:'bogus' as any}),'anonymous_only');
});

test('isAnonymousSurveyは変更せず既存呼び出し元との互換を維持する',()=>{
  assert.equal(isAnonymousSurvey({...defaultConfig,anonymous:true}),true);
  assert.equal(isAnonymousSurvey({...defaultConfig,anonymous:false}),false);
});

test('respondent_choiceは初期状態で回答方法未選択、選択肢2つを表示し名前inputは出さない',()=>{
  const html=render({identityMode:'respondent_choice'});
  assert.match(html,/回答方法を選択してください/);
  assert.match(html,/匿名で回答する/);
  assert.match(html,/お名前を入力せずに回答できます/);
  assert.match(html,/記名で回答する/);
  assert.match(html,/お名前と回答内容が運営者に表示されます/);
  assert.doesNotMatch(html,/identity-name-field/);
  assert.match(html,/name="identityChoice"/);
  const anonymousInput=html.match(/<input[^>]*name="identityChoice"[^>]*\/>/g)?.[0]??'';
  assert.doesNotMatch(anonymousInput,/checked/);
});

test('identified_onlyは常に必須の名前inputを表示し、選択UIと匿名案内は出さない',()=>{
  const html=render({identityMode:'identified_only'});
  assert.match(html,/identity-name-field/);
  assert.match(html,/survey-text-input/);
  assert.match(html,/お名前<span class="required-badge">※必須<\/span>/);
  assert.doesNotMatch(html,/回答方法を選択してください/);
  assert.doesNotMatch(html,/survey-anonymous-note/);
});

test('anonymous_onlyは匿名案内のみを表示し、選択UIも名前inputも出さない',()=>{
  const html=render({identityMode:'anonymous_only',anonymousText:'このアンケートは匿名です。'});
  assert.match(html,/survey-anonymous-note/);
  assert.doesNotMatch(html,/survey-identity/);
  assert.doesNotMatch(html,/identity-name-field/);
});

test('旧anonymous=false設定（identityMode未設定）はlegacy扱いで名前inputも回答方法選択も出さない',()=>{
  const html=render({anonymous:false,identityMode:undefined});
  assert.doesNotMatch(html,/identity-name-field/);
  assert.doesNotMatch(html,/回答方法を選択してください/);
  assert.doesNotMatch(html,/survey-anonymous-note/);
});

test('identityModeもanonymousも未設定のconfig（真のlegacy）は従来UIのまま送信できる',()=>{
  const html=render({anonymous:undefined,identityMode:undefined});
  assert.doesNotMatch(html,/identity-name-field/);
  assert.doesNotMatch(html,/回答方法を選択してください/);
});

test('legacyでもisAnonymousSurveyがtrueなら既存の匿名案内文は表示を維持する',()=>{
  const html=render({anonymous:undefined,identityMode:undefined,anonymousText:'こちらのアンケートは匿名です。'});
  assert.match(html,/survey-anonymous-note/);
  assert.doesNotMatch(html,/identity-name-field/);
});

test('SurveyRendererは回答方法未選択時にエラーを出し、記名選択時のみ名前必須にする検証ロジックを持つ',()=>{
  const source=read('../components/survey/SurveyRenderer.tsx');
  assert.match(source,/identityMode === 'respondent_choice' && !identityChoice/);
  assert.match(source,/setIdentityError\('回答方法を選択してください。'\)/);
  assert.match(source,/const needsName = identityMode === 'identified_only' \|\| \(identityMode === 'respondent_choice' && identityChoice === 'identified'\)/);
  assert.match(source,/if \(needsName && !trimmedName\)/);
});

test('送信payloadは3モードでのみidentityChoiceを送り、記名時のみrespondentNameを送る（legacyはどちらも送らない）',()=>{
  const source=read('../components/survey/SurveyRenderer.tsx');
  assert.match(source,/identityChoice: finalIdentityChoice/);
  assert.match(source,/\.\.\.\(finalIdentityChoice \? \{ identityChoice: finalIdentityChoice \} : \{\}\)/);
  assert.match(source,/\.\.\.\(finalIdentityChoice === 'identified' \? \{ respondentName: trimmedName \} : \{\}\)/);
  assert.match(source,/const finalIdentityChoice = identityMode === 'anonymous_only' \? 'anonymous' : identityMode === 'identified_only' \? 'identified' : identityMode === 'legacy' \? '' : identityChoice/);
});

test('API routeはidentityMode別にrespondentNameを必須化しserver側でvalidationする（クライアント値を信用しない）',()=>{
  const source=read('../app/api/responses/route.ts');
  assert.match(source,/identityChoice:z\.enum\(\['anonymous','identified'\]\)\.optional\(\)/);
  assert.match(source,/respondentName:z\.string\(\)\.max\(100\)\.optional\(\)/);
  assert.match(source,/identityMode==='anonymous_only'\){\s*identityChoice='anonymous';/);
  assert.match(source,/identityMode==='identified_only'\){\s*identityChoice='identified';/);
  assert.match(source,/if\(!name\)return NextResponse\.json\(\{error:'お名前を入力してください。'\},\{status:400\}\)/);
  assert.match(source,/if\(input\.identityChoice!=='anonymous'&&input\.identityChoice!=='identified'\)return NextResponse\.json\(\{error:'回答方法を選択してください。'\},\{status:400\}\)/);
  assert.match(source,/identityMode==='legacy'/);
  assert.match(source,/\.\.\.\(identityChoice\?\{identityChoice\}:\{\}\)/);
  assert.match(source,/\.\.\.\(respondentName\?\{respondentName\}:\{\}\)/);
});

test('legacy versionはidentityChoice/respondentNameを要求せずslug・versionId・answersだけで送信できる',()=>{
  const source=read('../app/api/responses/route.ts');
  assert.match(source,/identityMode==='legacy': no identityMode was ever configured/);
  assert.doesNotMatch(source,/identityMode==='legacy'\){\s*return NextResponse\.json/);
});

test('migrationはsubmit_survey_responseのみを更新しpublish_survey等の公開versionロジックには触れない',()=>{
  const source=read('../supabase/migrations/20260929010000_survey_identity_mode.sql');
  assert.match(source,/create or replace function public\.submit_survey_response/);
  assert.doesNotMatch(source,/publish_survey/);
  assert.match(source,/identity_mode is null or identity_mode not in \('respondent_choice', 'anonymous_only', 'identified_only'\)/);
  assert.match(source,/clean_identity_choice is null or clean_identity_choice not in \('anonymous', 'identified'\)/);
  assert.match(source,/raise exception 'お名前を入力してください'/);
  assert.match(source,/raise exception '必須項目が未回答です'/);
  assert.match(source,/'identityChoice', to_jsonb\(clean_identity_choice\)/);
});

test('新しい補正migrationは旧migrationを編集せずlegacy versionの識別要求を撤廃する',()=>{
  const original=read('../supabase/migrations/20260929010000_survey_identity_mode.sql');
  assert.doesNotMatch(original,/'legacy'/);
  const source=read('../supabase/migrations/20260929020000_fix_legacy_identity_compat.sql');
  assert.match(source,/create or replace function public\.submit_survey_response/);
  assert.doesNotMatch(source,/publish_survey/);
  assert.match(source,/identity_mode := case when v_config->>'anonymous' = 'true' then 'anonymous_only' else 'legacy' end/);
  assert.match(source,/-- legacy: no identity requirement, nothing recorded\./);
  assert.match(source,/clean_identity_choice := null;\s*clean_respondent_name := null;\s*end if;/);
});

test('displayIdentityは匿名/記名/未記録を正しく判定する',()=>{
  assert.deepEqual(displayIdentity({metadata:{identityChoice:'anonymous'}}),{method:'匿名',name:'—'});
  assert.deepEqual(displayIdentity({metadata:{identityChoice:'identified',respondentName:'山田太郎'}}),{method:'記名',name:'山田太郎'});
  assert.deepEqual(displayIdentity({metadata:{identityChoice:'identified'}}),{method:'記名',name:'—'});
  assert.deepEqual(displayIdentity({metadata:{}}),{method:'未記録',name:'—'});
  assert.deepEqual(displayIdentity({metadata:null}),{method:'未記録',name:'—'});
  assert.deepEqual(displayIdentity({}),{method:'未記録',name:'—'});
});

test('回答一覧・CSVに回答方法/回答者名の列が追加されている',()=>{
  const managePage=read('../app/admin/manage/[id]/responses/page.tsx');
  assert.match(managePage,/displayAnswer,displayIdentity,responseData/);
  assert.match(managePage,/<th>回答方法<\/th><th>回答者名<\/th>/);
  assert.match(managePage,/const identity=displayIdentity\(r\)/);
  const legacyPage=read('../app/admin/surveys/[id]/responses/page.tsx');
  assert.match(legacyPage,/<th>回答方法<\/th><th>回答者名<\/th>/);
  const csv=read('../app/api/admin/surveys/[id]/responses.csv/route.ts');
  assert.match(csv,/'回答日時','回答方法','回答者名'/);
  assert.match(csv,/identity\.method,identity\.name/);
});

test('lib/responses.tsのresponseDataはmetadata列を取得する',()=>{
  const source=read('../lib/responses.ts');
  assert.match(source,/select\('id,submitted_at,total_score,average_score,survey_version_id,metadata,response_answers/);
});

test('Builder編集画面は3モード選択でき、下書きのみ保存し公開版を書き換えない',()=>{
  const forms=read('../components/admin/SurveyForms.tsx');
  assert.match(forms,/name="identityMode"/);
  assert.match(forms,/<option value="respondent_choice">回答者が匿名・記名を選択<\/option>/);
  assert.match(forms,/<option value="anonymous_only">匿名のみ<\/option>/);
  assert.match(forms,/<option value="identified_only">記名のみ<\/option>/);
  assert.match(forms,/resolveIdentityMode\(config\)/);
  const actions=read('../app/actions.ts');
  assert.match(actions,/form\.has\('identityMode'\)&&\['respondent_choice','anonymous_only','identified_only'\]\.includes\(val\('identityMode'\)\)/);
  assert.match(actions,/\.eq\('id',versionId\)\.eq\('survey_id',surveyId\)\.eq\('status','draft'\)/);
  const workspace=read('../components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/input\.name==='identityMode'/);
});

test('LiveSurveyPreviewは公開画面と同じSurveyRendererをpreviewモードで再利用する（送信しない）',()=>{
  const source=read('../components/admin/LiveSurveyPreview.tsx');
  assert.match(source,/<SurveyRenderer name=\{name\} slug="preview" version=\{version\} preview onEditTarget=\{edit\}\/>/);
});
