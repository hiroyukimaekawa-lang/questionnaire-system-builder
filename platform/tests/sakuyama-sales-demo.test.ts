import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {ThanksPanel} from '../components/survey/ThanksPanel';

test('さくやま眼科のみ、legacy reviewTextQuestionId:null でも自由記述優先と生成を実行する',()=>{
  const source=readFileSync(new URL('../components/survey/SurveyRenderer.tsx',import.meta.url),'utf8');
  assert.match(source,/const sakuyamaDemo = slug === 'survey-1793862622762'/);
  assert.match(source,/version\.questions\.filter\(q => q\.type === 'textarea'\)/);
  assert.match(source,/const generated = sakuyamaDemo && !patientComment\.trim\(\)/);
  assert.doesNotMatch(source,/const generated = slug === 'survey-1793862622762' && version\.config\.reviewTextQuestionId !== null/);
});

test('営業テスト完了画面で下書きを編集でき、Google口コミリンクも表示する',()=>{
  const html=renderToStaticMarkup(React.createElement(ThanksPanel,{
    slug:'survey-1793862622762',
    text:'ご回答ありがとうございました',
    reviewMode:'all',
    reviewUrl:'https://example.com/review',
    primaryColor:'#123456',
    salesTestMode:true,
    previewCompletion:{generated:true,comment:'診療内容に満足しました。',reviewEligible:true},
  }));
  assert.match(html,/回答内容から作成した文章の下書き/);
  assert.match(html,/textarea/);
  assert.match(html,/診療内容に満足しました/);
  assert.match(html,/href="https:\/\/example\.com\/review"/);
  assert.match(html,/回答はデータベースに保存されません/);
});

test('営業テストの口コミリンクを意図的に遮断する処理がない',()=>{
  const source=readFileSync(new URL('../components/survey/ThanksPanel.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/if\(salesTestMode\)\{e\.preventDefault\(\);return;\}/);
  assert.match(source,/target="_blank" rel="noopener noreferrer"/);
});
