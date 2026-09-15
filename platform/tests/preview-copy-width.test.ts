import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const read=(path:string)=>readFileSync(join(root,path),'utf8');

test('文章編集はユーザー体験順で、不要項目は入力欄ごと畳める',()=>{
  const preview=read('components/admin/LiveSurveyPreview.tsx');
  const form=read('components/admin/SurveyForms.tsx');
  assert.match(preview,/① 回答画面/);assert.match(preview,/② サンクス/);assert.match(preview,/③ 口コミ遷移/);
  assert.match(preview,/プレビュー内の文章をクリックすると対応する編集欄へ移動します/);
  assert.match(form,/回答画面の文章/);assert.match(form,/サンクスページの文章/);assert.match(form,/Google口コミへ進む直前の文章/);
  assert.ok(form.indexOf('回答画面の文章')<form.indexOf('サンクスページの文章'));
  assert.ok(form.indexOf('サンクスページの文章')<form.indexOf('Google口コミへ進む直前の文章'));
  assert.match(form,/使用中（非表示にする）/);assert.match(form,/＋ 使用する/);
  assert.match(form,/copyEnabled\[key\]\?<label/);
  assert.match(form,/type="hidden" name=\{key\} value=""/);
  assert.match(form,/name="designPatch" value=\{JSON\.stringify\(copyPatch\)\}/);
});

test('サンクス文章と口コミ遷移前文章もプレビューから編集欄へ移動できる',()=>{
  const preview=read('components/admin/LiveSurveyPreview.tsx');
  const thanks=read('components/survey/ThanksPanel.tsx');
  assert.match(preview,/onEditTarget=\{edit\}/);
  assert.match(thanks,/onEditTarget\('completionText'\)/);
  assert.match(thanks,/onEditTarget\('googleReviewPromptText'\)/);
  assert.match(thanks,/onEditTarget\?\.\('googleReviewUrl'\)/);
});

test('口コミ遷移前の文章はconfigとして編集できる',()=>{
  const types=read('types/database.ts');
  const form=read('components/admin/SurveyForms.tsx');
  const thanks=read('components/survey/ThanksPanel.tsx');
  const page=read('app/s/[slug]/thanks/page.tsx');
  assert.match(types,/googleReviewPromptText\?: string/);
  assert.match(form,/googleReviewPromptText/);
  assert.match(thanks,/reviewPromptText===undefined\?DEFAULT_REVIEW_PROMPT/);
  assert.match(thanks,/reviewPrompt&&\(previewCompletion&&onEditTarget/);
  assert.match(page,/reviewPromptText=\{config\.googleReviewPromptText\}/);
});

test('スマホ表示は左右余白を縮めて横幅を広く使う',()=>{
  const globals=read('app/globals.css');
  const css=read('app/survey-overrides.css').replace(/\s*([{}:;,])\s*/g,'$1');
  assert.match(globals,/@import "\.\/survey-overrides\.css"/);
  assert.match(globals,/@import "\.\/admin-copy-flow\.css"/);
  assert.match(css,/\.survey-hero-inner\{padding-inline:12px;\}/);
  assert.match(css,/\.survey-hero-subtitle\{max-width:none;\}/);
  assert.match(css,/\.survey-content\{padding-inline:10px;\}/);
  assert.match(css,/@media \(max-width:390px\)[^{]*\{[^]*\.survey-content\{padding-inline:8px;\}/);
});
