import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const source=(path:string)=>readFileSync(join(import.meta.dirname,'..',path),'utf8');

test('SurveyRendererは5点と10点にスコア数別grid classを使用する',()=>{
  const renderer=source('components/survey/SurveyRenderer.tsx');
  assert.match(renderer,/rating-grid-\$\{scoreMax\(question\)\}/);
  assert.match(renderer,/length:scoreMax\(question\)/);
});

test('5点gridは5個を全幅均等配置し10点gridは10列を維持する',()=>{
  const css=source('app/survey.css');
  assert.match(css,/\.rating-grid\.rating-grid-5\{grid-template-columns:repeat\(5,clamp\([^}]+justify-content:space-between;gap:0\}/);
  assert.match(css,/\.rating-grid\.rating-grid-10\{grid-template-columns:repeat\(10,minmax\(0,1fr\)\)\}/);
});

test('Builder入力中previewとcomplete actionがheroTitleを反映・保存する',()=>{
  const workspace=source('components/builder/BuilderWorkspace.tsx');
  const actions=source('app/actions.ts');
  assert.match(workspace,/builder-hero-title-preview/);
  assert.match(workspace,/previewHeroTitle===null\?context:\{\.\.\.context,heroTitle:previewHeroTitle\}/);
  assert.match(actions,/rawHeroTitle=context\.heroTitle\?\?theme\.config\.heroTitle/);
  assert.match(actions,/title:heroTitle,heroLabel,heroTitle,heroSubtitle/);
});

test('質問タイトルは番号列と本文列に分け、必須表示を本文側に置く',()=>{
  const renderer=source('components/survey/SurveyRenderer.tsx');
  const css=source('app/survey.css');
  assert.match(renderer,/<h2 className="question-title"[^>]*><span className="question-number"[^>]*>.*?<\/span><span className="question-title-body"><span className="question-title-text">.*?<\/span>\{question\.required&&<span className="required-badge">※必須<\/span>\}<\/span><\/h2>/);
  assert.match(css,/\.question-title\{display:grid;grid-template-columns:auto minmax\(0,1fr\);[^}]*align-items:start;[^}]*column-gap:8px/);
  assert.match(css,/\.question-title-body\{min-width:0;line-height:inherit\}/);
  assert.match(css,/\.question-title-text\{min-width:0;line-break:strict;word-break:normal;overflow-wrap:break-word;text-wrap:pretty\}/);
  assert.doesNotMatch(css,/\.question-title-text\{[^}]*overflow-wrap:anywhere/);
  assert.match(renderer,/className="question-title-tail"/);
  assert.match(css,/\.question-title-tail\{white-space:nowrap\}/);
  assert.match(css,/\.required-badge\{display:inline;[^}]*margin-left:6px;[^}]*white-space:nowrap\}/);
  assert.doesNotMatch(css,/\.question-title\{[^}]*flex-wrap/);
});
