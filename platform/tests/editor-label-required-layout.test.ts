import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const source=(path:string)=>readFileSync(join(import.meta.dirname,'..',path),'utf8');

test('CustomQuestionBuilderは質問文直後に単独の必須toggleを置く',()=>{
  const ui=source('components/builder/BuilderWorkspace.tsx');
  assert.match(ui,/<label className="builder-field-label">質問文[^]*?<label className="question-required-toggle"><input type="checkbox" checked=\{question\.required\} onChange=\{event=>patch\(index,\{required:event\.target\.checked\}\)\}\/><span>必須にする<\/span><\/label><label className="builder-field-label">補足説明（任意）[^]*?<div className="question-editor-grid"><label className="builder-field-label">回答形式/);
});

test('QuestionQuickEditorは必須toggleを回答形式gridの外に置く',()=>{
  const ui=source('components/builder/BuilderWorkspace.tsx').split('function QuestionQuickEditor')[1];
  assert.match(ui,/<label className="builder-field-label">質問文[^]*?<label className="question-required-toggle"><input type="checkbox" checked=\{question\.required\} onChange=\{event=>update\(\{required:event\.target\.checked\}\)\}\/><span>必須にする<\/span><\/label><label className="builder-field-label">補足説明（任意）[^]*?<div className="question-editor-grid"><label className="builder-field-label">回答形式/);
  assert.doesNotMatch(ui,/<div className="question-editor-grid">[^]*question-required-toggle/);
});

test('既存QuestionBuilderは質問文直後にchecked値を保存する必須toggleを置く',()=>{
  const ui=source('components/admin/QuestionBuilder.tsx');
  assert.match(ui,/質問文<input[^]*?<\/label><label className="question-required-toggle"><input type="checkbox" checked=\{q\.required\} onChange=\{e=>patch\(i,\{required:e\.target\.checked\}\)\}\/><span>必須にする<\/span><\/label><label className="field editor-field-label">補足説明/);
  assert.doesNotMatch(ui,/回答設定[^]*?required:true/);
});

test('質問文サイズと編集項目ラベルはcompact classで公開表示CSSから分離する',()=>{
  const form=source('components/admin/SurveyForms.tsx');
  const adminCss=source('app/admin.css');
  const builderCss=source('app/builder.css');
  const surveyCss=source('app/survey.css');
  assert.match(form,/question-font-size-field/);
  assert.match(form,/question-font-size-control/);
  assert.match(form,/question-font-size-unit">px/);
  assert.match(adminCss,/editor-field-label[^}]*font-size:13px/);
  assert.match(builderCss,/builder-field-label\{font-size:13px/);
  assert.match(adminCss,/question-font-size-control input\{width:80px\}/);
  assert.match(surveyCss,/font-size:var\(--survey-question-font-size,17px\)/);
  assert.doesNotMatch(surveyCss,/editor-field-label|builder-field-label|question-font-size-control/);
});
