import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('文章と質問文はEnterで入力した改行をプレビューと公開画面に保持する',()=>{
  const renderer=read('../components/survey/SurveyRenderer.tsx');
  const css=read('../app/survey.css');
  for(const className of ['survey-hero-subtitle jp-copy jp-preserve-lines','survey-description jp-copy jp-preserve-lines','question-title-text jp-copy jp-preserve-lines','question-description jp-copy jp-preserve-lines'])assert.match(renderer,new RegExp(className));
  assert.match(css,/\.jp-preserve-lines,[\s\S]*?white-space: pre-line/);
});

test('管理画面と作成フローで文章と質問文を複数行入力できる',()=>{
  const config=read('../components/admin/SurveyForms.tsx');
  const questions=read('../components/admin/QuestionBuilder.tsx');
  const builder=read('../components/builder/BuilderWorkspace.tsx');
  assert.match(config,/<textarea rows=\{3\} name="heroSubtitle"/);
  assert.match(config,/<textarea rows=\{3\} name="description"/);
  assert.match(config,/<textarea rows=\{4\} name="introText"/);
  assert.match(questions,/<textarea rows=\{2\} data-question-title/);
  assert.match(builder,/質問文<textarea rows=\{2\}/);
  for(const source of [config,questions,builder])assert.match(source,/改行したい位置でEnter/);
});
