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

test('口コミ条件UIは質問ごとの基準点とAND/ORだけで設定できる',()=>{
  const source=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/各質問の基準点/);
  assert.match(source,/どれか1つ満たしたら表示/);
  assert.match(source,/すべて満たしたら表示/);
  assert.match(source,/aria-label="口コミ条件の判定方法"/);
  assert.match(source,/changeLogic\('or'\)/);
  assert.match(source,/changeLogic\('and'\)/);
  assert.match(source,/すべて同じ基準点にする/);
  assert.match(source,/applyCommonThreshold/);
  assert.match(source,/operator:'gte'/);
  assert.match(source,/logic:effectiveRule\.logic/);
  assert.doesNotMatch(source,/<option value="lte">/);
  assert.doesNotMatch(source,/<option value="eq">/);
});

test('口コミ条件テストは現在の設定で表示可否をリアルタイム確認できる',()=>{
  const source=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/動作確認/);
  assert.match(source,/evaluateGoogleReviewEligibility\(previewConfig,questions,answers\)/);
  assert.match(source,/この回答ではGoogle口コミを表示します/);
  assert.match(source,/この回答ではGoogle口コミを表示しません/);
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

test('新規作成STEP1で表示文章を編集・非表示にでき、説明文を重複させない',()=>{
  const source=readFileSync(new URL('../components/builder/SurveyWizard.tsx',import.meta.url),'utf8');
  assert.match(source,/メイン説明文/);
  assert.match(source,/回答欄の前の補足文/);
  assert.match(source,/匿名案内文/);
  assert.match(source,/使用中（非表示にする）/);
  assert.match(source,/初期状態では表示しません/);
  assert.match(source,/heroSubtitle:e\.target\.value,description:''/);
  assert.match(source,/introText:introEnabled\?'':defaultConfig\.introText,description:''/);
  assert.match(source,/anonymousText:anonymousTextEnabled\?'':defaultConfig\.anonymousText/);
  assert.doesNotMatch(source,/introText:config\.introText\|\|config\.description/);
});
