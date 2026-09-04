import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

test('completeは固定POST APIを使い、成功時だけ遷移する',()=>{
  const ui=source('components/builder/BuilderWorkspace.tsx');
  const complete=ui.slice(ui.indexOf('const complete='),ui.indexOf('const version='));
  assert.doesNotMatch(ui,/completeBuilderAction/);
  assert.match(complete,/if\(pending\)return/);
  assert.match(complete,/fetch\('\/api\/admin\/surveys\/create-from-builder'/);
  assert.match(complete,/method:'POST',headers:\{'content-type':'application\/json'\},body:JSON\.stringify\(\{sessionId,context\}\)/);
  assert.match(complete,/try\{json=await response\.json\(\)[^]*catch\{json=\{\};\}/);
  assert.match(complete,/if\(response\.ok&&typeof json\.surveyId==='string'&&json\.surveyId\)\{router\.push/);
  assert.match(complete,/アンケートを作成できませんでした。もう一度お試しください。/);
  assert.match(complete,/通信エラーが発生しました。画面を再読み込みして、もう一度お試しください。/);
  assert.match(complete,/catch\{setSaveStatus\('error'\)/);
  assert.equal((complete.match(/router\.push/g)??[]).length,1);
});

test('作成中はボタンをdisabledにする',()=>{
  const ui=source('components/builder/BuilderWorkspace.tsx');
  assert.match(ui,/disabled=\{pending\} onClick=\{complete\}>\{pending\?'作成中…':'この内容で作成'\}/);
});

test('新規作成画面に詳細を表示しない再試行可能なerror boundaryがある',()=>{
  const path='app/admin/surveys/new/error.tsx';
  assert.equal(existsSync(join(root,path)),true);
  const boundary=source(path);
  assert.match(boundary,/'use client'/);
  assert.match(boundary,/onClick=\{reset\}/);
  assert.match(boundary,/アンケート管理へ戻る/);
  assert.doesNotMatch(boundary,/error\.message|error\.stack|Supabase|secret/i);
});

test('作成APIは認証・validation・全保存stageを備え、秘密情報をlogしない',()=>{
  const path='app/api/admin/surveys/create-from-builder/route.ts';
  assert.equal(existsSync(join(root,path)),true);
  const route=source(path);
  assert.match(route,/export async function POST/);
  assert.match(route,/auth\.getUser\(\)/);
  assert.match(route,/profile\.role!=='admin'&&profile\.role!=='sales'/);
  assert.match(route,/!profile\.is_active/);
  assert.match(route,/401/);assert.match(route,/403/);assert.match(route,/400/);assert.match(route,/500/);assert.match(route,/status:200/);
  assert.match(route,/ruleBasedBuilderEngine\.getMissingFields\(context\)/);
  assert.match(route,/context\.questions\.length===0/);
  assert.match(route,/validateQuestion\(question\)/);
  for(const stage of ['surveys.insert','survey_versions.insert','questions.insert','question_options.insert','surveys.current_draft_version_id.update','builder_sessions.completed.update'])assert.match(route,new RegExp(stage.replaceAll('.','\\.')));
  assert.match(route,/heroLabel=context\.heroLabel\?\.trim\(\)\|\|'QUESTIONNAIRE'/);
  assert.match(route,/heroTitle=context\.heroTitle\?\.trim\(\)\|\|theme\.config\.heroTitle/);
  assert.match(route,/heroSubtitle=context\.heroSubtitle\?\.trim\(\)\|\|theme\.config\.heroSubtitle/);
  assert.match(route,/googleReviewMode:reviewUrl\?'all' as const:'disabled' as const/);
  assert.doesNotMatch(route,/googleReviewMode:[^\n]*(score|rating|conditional)/i);
  assert.doesNotMatch(route,/console\.error[^]*(password|token|cookie|authorization|email)/i);
  assert.doesNotMatch(route,/\.delete\(/);
});
