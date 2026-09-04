import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {defaultConfig,normalizeQuestionFontSize} from '../lib/survey';
import {resolveSurveyTheme} from '../lib/theme/templates';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

test('質問文サイズのdefaultと旧config fallback',()=>{
  assert.equal(defaultConfig.questionFontSize,17);
  assert.equal(resolveSurveyTheme({...defaultConfig,questionFontSize:undefined}).questionFontSize,17);
});
test('質問文サイズを14〜22の整数に安全に正規化する',()=>{
  assert.equal(normalizeQuestionFontSize(14),14);assert.equal(normalizeQuestionFontSize(22),22);
  assert.equal(normalizeQuestionFontSize(13),14);assert.equal(normalizeQuestionFontSize(23),22);
  assert.equal(normalizeQuestionFontSize(Number.NaN),17);
});
test('Rendererとmobile CSSはCSS variableをsingle source of truthとする',()=>{
  const renderer=source('components/survey/SurveyRenderer.tsx'),css=source('app/survey.css');
  assert.match(renderer,/--survey-question-font-size/);
  assert.match(css,/font-size:var\(--survey-question-font-size,17px\)/);
  assert.doesNotMatch(css,/\.question-title\{font-size:(?:16|17)px/);
});
test('既存編集とBuilderに数値入力・リアルタイム反映・保存がある',()=>{
  const form=source('components/admin/SurveyForms.tsx'),editor=source('components/admin/SurveyEditorWorkspace.tsx'),workspace=source('components/builder/BuilderWorkspace.tsx'),actions=source('app/actions.ts');
  assert.match(form,/name="questionFontSize" type="number" min="14" max="22"/);
  assert.match(editor,/input\.name==='questionFontSize'\?Number\(input\.value\)/);
  assert.match(workspace,/builder-question-font-size-preview/);
  assert.match(actions,/questionFontSize:normalizeQuestionFontSize\(val\('questionFontSize'\)\)/);
  assert.match(actions,/questionFontSize:normalizeQuestionFontSize\(context\.questionFontSize\)/);
});
