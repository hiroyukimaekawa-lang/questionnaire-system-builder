import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('質問カード直下から次の質問を追加できる',()=>{
  const source=readFileSync(new URL('../components/admin/QuestionBuilder.tsx',import.meta.url),'utf8');
  assert.match(source,/この下に追加する回答形式/);
  assert.match(source,/この下に質問を追加/);
  assert.match(source,/next\.splice\(index\+1,0,created\)/);
  assert.match(source,/addQuestionAfter\(i\)/);
  assert.match(source,/addQuestionAfter\(-1\)/);
});

test('口コミ案内モードはチェックしづらいradioではなく選択ボタンで切り替える',()=>{
  const source=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/type="hidden" name="googleReviewMode" value=\{mode\}/);
  assert.match(source,/aria-label="Google口コミへの案内方法"/);
  assert.match(source,/aria-pressed=\{mode===value\}/);
  assert.match(source,/onClick=\{\(\)=>changeMode\(value\)\}/);
  assert.doesNotMatch(source,/type="radio" name="googleReviewMode"/);
});

test('口コミ条件UIは全評価共通か質問別の点数以上に絞り、壊れた旧条件を自動補正する',()=>{
  const source=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/すべての評価項目が基準点以上/);
  assert.match(source,/質問ごとに基準点を設定/);
  assert.match(source,/aria-label="口コミ条件の設定方法"/);
  assert.match(source,/aria-pressed=\{conditionStyle==='all'\}/);
  assert.match(source,/aria-pressed=\{conditionStyle==='per-question'\}/);
  assert.match(source,/allRatingsRule/);
  assert.match(source,/perQuestionRule/);
  assert.match(source,/ruleNeedsNormalization/);
  assert.match(source,/new Set\(conditionIds\)\.size!==conditionIds\.length/);
  assert.match(source,/operator:'gte'/);
  assert.match(source,/logic:'and'/);
  assert.match(source,/すべての評価質問を個別に確認し、全条件を満たした場合だけ口コミをご案内します/);
  assert.match(source,/重複・OR・不足質問が見つかったため/);
  assert.doesNotMatch(source,/いずれかを満たす（OR）/);
  assert.doesNotMatch(source,/<option value="lte">/);
  assert.doesNotMatch(source,/<option value="eq">/);
});

test('既存編集画面ではカラーやテーマを営業担当者へ表示しない',()=>{
  const source=readFileSync(new URL('../components/admin/SurveyForms.tsx',import.meta.url),'utf8');
  assert.match(source,/文章・ロゴ設定/);
  assert.doesNotMatch(source,/デザインテンプレート/);
  assert.doesNotMatch(source,/type="color"/);
  assert.doesNotMatch(source,/メインカラー/);
  assert.doesNotMatch(source,/サブカラー/);
  assert.doesNotMatch(source,/アクセントカラー/);
  assert.doesNotMatch(source,/カードの丸み/);
  assert.match(source,/type="hidden" name="primaryColor"/);
  assert.match(source,/type="hidden" name="themeId"/);
});

test('新規作成Builderでもカラー入力を質問しない',()=>{
  const engine=readFileSync(new URL('../lib/builder/engine.ts',import.meta.url),'utf8');
  const progress=readFileSync(new URL('../lib/builder/progress.ts',import.meta.url),'utf8');
  assert.doesNotMatch(engine,/店舗のメインカラーはありますか/);
  assert.doesNotMatch(engine,/missing\.push\('mainColor'\)/);
  assert.doesNotMatch(progress,/steps:\[[^\]]*'mainColor'/);
  assert.match(progress,/label:'文章・ロゴ'/);
});
