import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const read=(path:string)=>readFileSync(join(root,path),'utf8');

test('文章編集はプレビューから移動でき、空欄で非表示にできる案内を表示する',()=>{
  const preview=read('components/admin/LiveSurveyPreview.tsx');
  const form=read('components/admin/SurveyForms.tsx');
  assert.match(preview,/プレビュー内の文章をクリックすると対応する編集欄へ移動します/);
  assert.match(preview,/編集欄を空欄にするとプレビュー・公開画面から非表示になります/);
  assert.match(form,/不要な文章は空欄にしてください/);
  assert.match(form,/空欄にするとプレビュー・公開画面から非表示になります。改行したい位置でEnterを押してください/);
  assert.match(form,/name="designPatch" value=\{JSON\.stringify\(copyPatch\)\}/);
});

test('スマホ表示は左右余白を縮めて横幅を広く使う',()=>{
  const globals=read('app/globals.css');
  const css=read('app/survey-overrides.css').replace(/\s*([{}:;,])\s*/g,'$1');
  assert.match(globals,/@import "\.\/survey-overrides\.css"/);
  assert.match(css,/\.survey-hero-inner\{padding-inline:12px;\}/);
  assert.match(css,/\.survey-hero-subtitle\{max-width:none;\}/);
  assert.match(css,/\.survey-content\{padding-inline:10px;\}/);
  assert.match(css,/@media \(max-width:390px\)[^{]*\{[^]*\.survey-content\{padding-inline:8px;\}/);
});
