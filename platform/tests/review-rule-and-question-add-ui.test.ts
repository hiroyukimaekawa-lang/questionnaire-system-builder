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

test('口コミ条件UIは全評価共通か質問別の点数以上に絞る',()=>{
  const source=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/すべての評価項目が基準点以上/);
  assert.match(source,/質問ごとに基準点を設定/);
  assert.match(source,/allRatingsRule/);
  assert.match(source,/operator:'gte'/);
  assert.match(source,/logic:'and'/);
  assert.match(source,/合計点や平均点ではなく、各質問を個別に判定します/);
  assert.doesNotMatch(source,/いずれかを満たす（OR）/);
  assert.doesNotMatch(source,/<option value="lte">/);
  assert.doesNotMatch(source,/<option value="eq">/);
});

test('既存編集画面ではカラーやテーマを営業担当者へ表示しない',()=>{
  const source=readFileSync(new URL('../components/admin/SurveyForms.tsx',import.meta.url),'utf8');
  assert.match(source,/デザインは共通仕様で統一されています/);
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
