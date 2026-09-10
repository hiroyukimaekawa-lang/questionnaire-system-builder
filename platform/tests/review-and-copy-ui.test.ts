import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {ThanksPanel} from '../components/survey/ThanksPanel';
import {SurveyRenderer} from '../components/survey/SurveyRenderer';
import {PublishSection} from '../components/admin/PublishSection';
import {defaultConfig} from '../lib/survey';
import {readFileSync} from 'node:fs';
Object.assign(globalThis,{React});
const text='一行目\n二行目 <b>そのまま</b>';
const renderThanks=(reviewMode:'all'|'score'|'disabled',reviewUrl='https://example.com/review?x=1&y=2')=>renderToStaticMarkup(React.createElement(ThanksPanel,{slug:'test',text,reviewMode,reviewUrl,primaryColor:'#123456'}));
test('all CTAは正しいhrefと別タブ属性を持つ通常リンク',()=>{
  assert.match(renderThanks('all'),/href="https:\/\/example.com\/review\?x=1&amp;y=2" target="_blank" rel="noopener noreferrer"/);
});
test('disabled・未判定score・非HTTP URLにリンクを出さない',()=>{
  for(const html of [renderThanks('disabled'),renderThanks('score'),renderThanks('all','javascript:alert(1)')])assert.doesNotMatch(html,/<a /);
});
test('completionTextの改行は保持しHTMLとして解釈しない',()=>{
  const html=renderThanks('all');assert.ok(html.includes('一行目\n二行目 &lt;b&gt;そのまま&lt;/b&gt;'));assert.doesNotMatch(html,/<b>/);
});
test('匿名ONの任意文・改行と匿名OFFの領域省略を共通Rendererに反映',()=>{
  const render=(anonymous:boolean,anonymousText=text)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{} as any},React.createElement(SurveyRenderer,{name:'テスト店舗',slug:'test',preview:true,version:{id:'v',config:{...defaultConfig,anonymous,anonymousText,description:text,introText:text},questions:[]} as any})));
  assert.match(render(true),/survey-anonymous-note jp-copy jp-preserve-lines/);
  assert.equal(render(true).split('一行目\n二行目 &lt;b&gt;そのまま&lt;\/b&gt;').length-1,3);
  assert.doesNotMatch(render(false),/survey-intro|survey-anonymous-note/);
  assert.match(render(true,''),/※こちらのアンケートは匿名です。/);
});
test('公開済みでも既存publishActionへ再公開フォームを接続する',()=>{
  const html=renderToStaticMarkup(React.createElement(PublishSection,{status:'published',hasPublishedBefore:true,publicUrl:'https://example.com/test',slug:'test',publishAction:async()=>({}),unpublishAction:async()=>({})}));
  assert.match(html,/変更内容を公開する/);assert.match(html,/https:\/\/example.com\/test/);
});
test('コピー失敗時に手動コピーと口コミ遷移を分けて案内する',()=>{
  const source=readFileSync(new URL('../components/survey/ThanksPanel.tsx',import.meta.url),'utf8');
  assert.match(source,/await navigator.clipboard.writeText\(comment\)/);assert.match(source,/catch\s*\{[\s\S]*?setCopyFailed\(true\)/);
  assert.match(source,/文章をコピーする/);assert.match(source,/Google口コミへ進む/);
  assert.doesNotMatch(source,/window\.open/);
  const css=readFileSync(new URL('../app/survey.css',import.meta.url),'utf8');assert.match(css,/\.jp-preserve-lines,[\s\S]*?\.thanks-lead,[\s\S]*?\.completion-copy span\s*\{ white-space: pre-line/);
});
test('口コミ条件はgteを初期値とし複数条件だけAND/ORを表示、完了条件編集も維持',()=>{
  const source=readFileSync(new URL('../components/admin/CompletionSettingsForm.tsx',import.meta.url),'utf8');
  const settings=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(settings,/rule.conditions.length>1&&/);
  assert.match(settings,/operator:'gte'/);
  assert.match(settings,/c.operator==='lte'.*?'以下'.*?'eq'.*?'と等しい'.*?'以上'/);
  assert.match(settings,/比較方法/);
  assert.match(source,/rules.map\(\(rule,ri\)/);
  assert.match(source,/name="completionRules" value=\{JSON.stringify\(rules\)\}/);
});
