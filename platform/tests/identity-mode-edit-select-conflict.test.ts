import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

// Root cause: SurveyEditorWorkspace wrapped the whole editor panel with both
// onInput={syncForm} and onChange={syncForm}. For a <select>, the browser fires a
// native `input` event before `change`; since only the wrapper (not ConfigForm's own
// <select>) had an onInput handler, that bubbled `input` event reached syncForm FIRST,
// which unconditionally wrote input.value into the parent's config.identityMode -
// racing ConfigForm's own controlled-select state update on the subsequent `change`
// event. Clicking a mode in the legacy survey edit form could not change the visible
// selection in production.

test('1: editor wrapperはonInputを持たずonChangeのみでsyncFormを呼ぶ(select二重発火の競合源を除去)',()=>{
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/<div className="editor-panel" onChange=\{syncForm\}>/);
  assert.doesNotMatch(workspace,/onInput=\{syncForm\}/);
  assert.doesNotMatch(workspace,/onInput=/);
});

test('1: syncFormはidentityModeを一切処理しない(ConfigForm自身のonChangeが唯一の書き込み経路)',()=>{
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/if\(!input\.name\|\|input\.name==='identityMode'\)return;/);
  assert.doesNotMatch(workspace,/setConfig\(current=>\(\{\.\.\.current,identityMode:input\.value/);
});

test('2/3/4: ConfigFormのidentityMode selectは自身のuseStateだけで表示を制御し、親の再レンダーで値を奪われない',()=>{
  const forms=source('components/admin/SurveyForms.tsx');
  assert.match(forms,/const \[identityMode,setIdentityMode\]=useState<IdentityModeFormValue>\(initialIdentityMode\)/);
  assert.match(forms,/<select name="identityMode" value=\{identityMode\} onChange=\{e=>\{const value=e\.target\.value as IdentityModeFormValue;setIdentityMode\(value\);onChange\?\.\(\{identityMode:value==='legacy'\?undefined:value\}\);\}\}>/);
  // config is a stable prop (draft.config from the parent), not the parent's live
  // `config` state, so ConfigForm never remounts/resets identityMode on unrelated
  // parent re-renders (e.g. another field's syncForm write).
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/<ConfigForm surveyId=\{survey\.id\} versionId=\{draft\.id\} config=\{draft\.config\}/);
});

test('5: 明示選択時のみConfigFormのonChangeプロップがPreview用configへidentityModeを反映する',()=>{
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/<ConfigForm surveyId=\{survey\.id\} versionId=\{draft\.id\} config=\{draft\.config\} onChange=\{patch=>setConfig\(c=>\(\{\.\.\.c,\.\.\.patch\}\)\)\}\/>/);
});

test('10: text/textarea等の他フィールドのlive preview同期は維持される(identityModeだけが除外対象)',()=>{
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/'primaryColor','backgroundColor','secondaryColor','accentColor','heroOverlayColor','heroTextColor','buttonBackground','buttonTextColor','cardBackground','logoBadgeBackground','title','heroLabel','heroTitle','questionFontSize','heroSubtitle','description','introText','anonymousText','completionText','submitLabel','logoUrl','iconUrl','logoMode','heroBackgroundType','themeId','googleReviewMode','googleReviewUrl'\]\.includes\(input\.name\)/);
  assert.doesNotMatch(workspace,/'identityMode'\]/);
});

test('8/9: publish_survey RPCは現行draftをそのまま公開版へ昇格し、新しい次draftへも同じconfigを複製する(identityModeを含め特別扱いしない)',()=>{
  const migration=source('supabase/migrations/202608310001_initial_platform.sql');
  assert.match(migration,/update survey_versions set status='published',published_at=now\(\) where id=draft\.id;/);
  assert.match(migration,/insert into survey_versions\(survey_id,version,status,config,created_by\) values\(s\.id,draft\.version\+1,'draft',draft\.config,auth\.uid\(\)\) returning id into new_draft_id;/);
});

test('8/9: publishActionは公開後の次draft configをdraft.config全体から再構成し、identityModeを取り除かない',()=>{
  const actions=source('app/actions.ts');
  assert.match(actions,/config:remapConfigQuestions\(draft\.config,idMap\)/);
  assert.doesNotMatch(actions,/identityMode:undefined/);
  assert.doesNotMatch(actions,/delete\s+\w+\.identityMode/);
});

test('7: legacyのまま保存してもidentityModeはeditedへ追加されない(既存ガードを維持)',()=>{
  const actions=source('app/actions.ts');
  assert.match(actions,/form\.has\('identityMode'\)&&\['respondent_choice','anonymous_only','identified_only'\]\.includes\(val\('identityMode'\)\)/);
});
