import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('口コミ設定保存時は現在の評価質問へ自動補正してから検証する',()=>{
  const source=readFileSync(new URL('../app/completion-actions.ts',import.meta.url),'utf8');
  const normalizeIndex=source.indexOf('normalizeGoogleReviewRuleForQuestions(incomingRule, questions)');
  const validateIndex=source.indexOf('validateGoogleReviewRuleForQuestions(googleReviewRule, questions)');
  assert.ok(normalizeIndex>=0);
  assert.ok(validateIndex>normalizeIndex);
  assert.match(source,/if \(!ratingQuestions\.length\) return \{ error: '評価条件を使うには、評価質問を1つ以上追加してください。' \}/);
});
