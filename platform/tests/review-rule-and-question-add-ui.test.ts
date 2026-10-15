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
  assert.match(source,/type="hidden" name="googleReviewMode" value=\{storedMode\}/);
  assert.match(source,/aria-label="Google口コミへの案内方法"/);
  assert.match(source,/\['score','条件付き'\]/);
  assert.match(source,/aria-pressed=\{visibleMode===value\}/);
  assert.match(source,/onClick=\{\(\)=>onChange\(\{googleReviewMode:value,scoreGatesGoogleReview:value==='score'\}\)\}/);
  assert.doesNotMatch(source,/type="radio" name="googleReviewMode"/);
});

test('合計点UIは質問複数選択・gte閾値・最大点を設定できる',()=>{
  const source=readFileSync(new URL('../components/admin/CompletionRuleSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/合計対象（複数選択）/);
  assert.match(source,/最大合計点/);
  assert.match(source,/合計点の閾値/);
  assert.match(source,/operator:'gte'/);
  assert.match(source,/個別条件/);
  assert.match(source,/すべて満たす（AND）/);
  assert.match(source,/どれか満たす（OR）/);
});

test('口コミUIは条件付きCTAを評価分類に連動させる設定を提供する',()=>{
  const source=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/全回答者へ表示/);
  assert.match(source,/条件を満たした回答者にだけ口コミCTAを表示する/);
  assert.match(source,/scoreGatesGoogleReview/);
});

test('新規作成STEP3でも条件付きの評価分類を設定できる',()=>{
  const source=readFileSync(new URL('../components/builder/SurveyWizard.tsx',import.meta.url),'utf8');
  assert.match(source,/import \{CompletionRuleSettings\}/);
  assert.match(source,/conditionalReview&&<CompletionRuleSettings/);
  assert.match(source,/onChange=\{completionRules=>design\(\{completionRules\}\)\}/);
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
