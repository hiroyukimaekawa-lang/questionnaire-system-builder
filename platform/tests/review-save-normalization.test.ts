import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('内部分類の保存時に既存口コミ条件を自動補正・自動上書きしない',()=>{
  const source=readFileSync(new URL('../app/completion-actions.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/normalizeGoogleReviewRuleForQuestions/);
  assert.doesNotMatch(source,/parseGoogleReviewRuleJson/);
  assert.match(source,/googleReviewRule = \(version\.config as SurveyConfig\)\.googleReviewRule \?\? null/);
  assert.match(source,/submittedReviewMode === 'conditional'/);
  assert.match(source,/\.googleReviewMode = 'conditional'/);
});
