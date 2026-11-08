import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../components/survey/ThanksPanel.tsx',import.meta.url),'utf8');

test('Google口コミへのリンクはコピー処理を待たない独立したa要素である',()=>{
  assert.match(source,/<a className="btn thanks-review-button jp-ui-label" href=\{href!\} target="_blank"/);
  assert.doesNotMatch(source,/window\.location\.assign/);
  assert.doesNotMatch(source,/review\(true\)/);
});

test('感想コピーの成否に関係なくGoogle口コミリンクを表示する',()=>{
  assert.match(source,/<button type="button" className="btn secondary jp-ui-label" onClick=\{\(\)=>void copyComment\(\)\}>感想をコピーする<\/button>/);
  assert.match(source,/\{showReview && \(/);
  assert.doesNotMatch(source,/\{copyFailed&&<div/);
  assert.match(source,/Google口コミへの移動は上のボタンから可能です/);
});

test('プレビュー時は外部口コミサイトへ遷移しない',()=>{
  assert.match(source,/if\(previewCompletion\)\{e\.preventDefault\(\);onEditTarget\?\.\('googleReviewUrl'\);\}/);
});
